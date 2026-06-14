import fs from 'node:fs/promises';
import path from 'node:path';
import type {
  BuildingState,
  BuildingUpdatedEvent,
  NpcMovedEvent,
  NpcState,
  QtownWorldSnapshot,
  ResourceUpdatedEvent,
  Vec3,
  WorldTime,
} from '@jingzhong-biancheng/shared';

import { WorldClock, type GameTime } from './WorldClock.js';
import { buildSnapshot } from './QtownSnapshotBuilder.js';
import { ActionRegistry, ActionExecutor } from '../actions/index.js';
import { EventRegistry, EventLogger } from '../events/index.js';
import { NeedsSystem, BehaviorTreeRunner } from '../ai/index.js';
import { AccountService } from '../economy/AccountService.js';

export type RuntimeStatus = 'RUNNING' | 'STOPPED';
export type SimulationMode = 'ONLINE_REALTIME' | 'OFFLINE_LOW_FREQ';

export interface WorldRuntimeStatus {
  worldId: string;
  status: RuntimeStatus;
  simulationMode: SimulationMode;
  viewerCount: number;
  gameTime: GameTime;
}

export interface WorldRuntimeOptions {
  worldId?: string;
  clock?: WorldClock;
  now?: () => number;
  seedPath?: string;
}

// Event type that the runtime emits
export type QtownWorldEvent =
  | NpcMovedEvent
  | { type: 'npc_action_changed'; npcId: string; currentAction: string; status: NpcState['status'] }
  | BuildingUpdatedEvent
  | ResourceUpdatedEvent;

type DeltaListener = (event: QtownWorldEvent) => void;

// Walkable area bounds for NPC movement (plaza + roads area)
const WALK_BOUNDS = { minX: -6, maxX: 6, minZ: -6, maxZ: 6 };

export class WorldRuntime {
  readonly worldId: string;
  readonly clock: WorldClock;
  readonly actionRegistry: ActionRegistry;
  readonly actionExecutor: ActionExecutor;
  readonly eventRegistry: EventRegistry;
  readonly eventLogger: EventLogger;
  readonly needsSystem: NeedsSystem;
  readonly behaviorTree: BehaviorTreeRunner;
  readonly accountService: AccountService;

  private readonly now: () => number;
  private mapData: any = null;
  private npcs: NpcState[] = [];
  private buildings: BuildingState[] = [];
  private resourceNodes: any[] = [];
  private zones: any[] = [];
  private tick = 0;
  private readonly deltaListeners = new Set<DeltaListener>();
  private runtimeStatus: RuntimeStatus = 'STOPPED';
  private viewerCount = 0;

  // NPC movement tracking
  private npcMoveTimers = new Map<string, { nextMoveTick: number; targetIdx: number }>();
  private moveWaypoints: Vec3[] = [];

  constructor(options: WorldRuntimeOptions = {}) {
    this.worldId = options.worldId ?? 'qtown_v0_1';
    this.clock = options.clock ?? new WorldClock();
    this.now = options.now ?? Date.now;
    this.actionRegistry = new ActionRegistry();
    this.actionExecutor = new ActionExecutor(this.actionRegistry);
    this.eventRegistry = new EventRegistry();
    this.eventLogger = new EventLogger(this.eventRegistry, { worldId: this.worldId });
    this.needsSystem = new NeedsSystem();
    this.behaviorTree = new BehaviorTreeRunner(this.needsSystem);
    this.accountService = new AccountService();

    // Forward action events as world events and log them
    this.actionExecutor.subscribe((event) => {
      if (event.type === 'action_started') {
        this.emit({
          type: 'npc_action_changed',
          npcId: event.npcId,
          currentAction: event.actionCode,
          status: 'working',
        });
      } else if (event.type === 'action_completed') {
        this.emit({
          type: 'npc_action_changed',
          npcId: event.npcId,
          currentAction: '',
          status: 'idle',
        });

        // Log the action completion as a world event
        const gameTime = this.clockToGameTime();
        this.eventLogger.log({
          eventCode: event.actionCode,
          actorId: event.npcId,
          happenedAtTick: this.tick,
          gameTime,
          payload: { durationTicks: event.durationTicks },
        });

        // Handle economic effects
        if (event.actionCode === 'buy_item') {
          // TODO: Get item price from context and deduct
          console.log(`[Economy] ${event.npcId} completed buy_item`);
        }
      } else if (event.type === 'action_interrupted') {
        this.emit({
          type: 'npc_action_changed',
          npcId: event.npcId,
          currentAction: '',
          status: 'idle',
        });
      }
    });
  }

  async load(seedPath: string): Promise<void> {
    const raw = await fs.readFile(seedPath, 'utf-8');
    this.mapData = JSON.parse(raw);

    const time = this.clockToGameTime();
    const snapshot = buildSnapshot(this.mapData, this.tick, time);
    this.npcs = [...snapshot.npcs];
    this.buildings = [...snapshot.buildings];
    this.resourceNodes = this.mapData.resourceNodes ?? [];
    this.zones = this.mapData.zones ?? [];

    // Define waypoints around plaza and roads for NPC wandering
    this.moveWaypoints = this.buildWaypoints();

    console.log(`[WorldRuntime] Loaded map: ${this.mapData.id}`);
    console.log(`[WorldRuntime] - ${this.buildings.length} buildings`);
    console.log(`[WorldRuntime] - ${this.resourceNodes.length} resource nodes`);
    console.log(`[WorldRuntime] - ${this.zones.length} zones`);

    // Load action definitions — resolve relative to project root
    const projectRoot = path.resolve(path.dirname(seedPath), '..');
    const contentDir = path.join(projectRoot, 'content');
    const actionsDir = path.join(contentDir, 'actions');
    try {
      await this.actionRegistry.loadDir(actionsDir);
    } catch (err) {
      console.warn(`[WorldRuntime] Could not load actions from ${actionsDir}:`, err);
    }

    // Load event definitions
    const eventsDir = path.join(contentDir, 'events');
    try {
      await this.eventRegistry.loadDir(eventsDir);
    } catch (err) {
      console.warn(`[WorldRuntime] Could not load events from ${eventsDir}:`, err);
    }

    // Initialize NPC needs
    for (const npc of this.npcs) {
      this.needsSystem.initCharacter(npc.id);
    }
    console.log(`[WorldRuntime] Initialized needs for ${this.npcs.length} NPCs`);

    // Initialize NPC accounts
    for (const npc of this.npcs) {
      this.accountService.createAccount({
        worldId: this.worldId,
        ownerType: 'character',
        ownerId: npc.id,
        initialBalance: 50, // 初始 50 铜钱
      });
    }
    console.log(`[WorldRuntime] Created accounts for ${this.npcs.length} NPCs`);
  }

  private buildWaypoints(): Vec3[] {
    const points: Vec3[] = [];
    // Plaza area waypoints
    for (let x = -4; x <= 4; x += 2) {
      for (let z = -4; z <= 4; z += 2) {
        points.push({ x, y: 0, z });
      }
    }
    // Road waypoints (N, S, E, W)
    for (let z = -9; z <= -6; z += 1.5) points.push({ x: 0, y: 0, z });
    for (let z = 6; z <= 11; z += 1.5) points.push({ x: 0, y: 0, z });
    for (let x = -9; x <= -6; x += 1.5) points.push({ x, y: 0, z: -2 });
    for (let x = 6; x <= 9; x += 1.5) points.push({ x, y: 0, z: -2 });
    return points;
  }

  start(): void {
    if (this.runtimeStatus === 'RUNNING') {
      return;
    }
    this.runtimeStatus = 'RUNNING';
    this.clock.start(() => this.onTick());
  }

  stop(): void {
    this.clock.stop();
    this.runtimeStatus = 'STOPPED';
  }

  get currentTick(): number {
    return this.tick;
  }

  private onTick(): void {
    this.clock.advance();
    this.tick += 1;

    // Tick the action system
    const actionEvents = this.actionExecutor.tick(this.tick);
    // Action events are already forwarded to world events via the constructor subscription

    // Decay NPC needs every tick
    this.needsSystem.decayAll();

    // Update money pressure based on balances
    for (const npc of this.npcs) {
      const balance = this.accountService.getBalance(npc.id);
      this.needsSystem.updateMoneyPressure(npc.id, balance);
    }

    // Every ~5 ticks (1 second at 5 tps), assign actions to idle NPCs
    if (this.tick % 5 === 0) {
      this.assignNpcActions();
    }
  }

  /**
   * Assign actions to idle NPCs using the behavior tree.
   */
  private assignNpcActions(): void {
    const movableNpcs = this.npcs.filter((n) => n.role !== 'player');
    if (movableNpcs.length === 0) return;

    // Pick a random idle NPC
    const idleNpcs = movableNpcs.filter((n) => {
      const running = this.actionExecutor.getRunningAction(n.id);
      return !running || running.status !== 'running';
    });
    if (idleNpcs.length === 0) return;

    const npc = idleNpcs[Math.floor(Math.random() * idleNpcs.length)];
    if (!npc) return;

    // Build context for behavior tree
    const npcPosition = npc.position;
    const nearbyObjects: Map<string, string[]> = new Map();
    const nearbyCharacters: string[] = [];

    // Find nearby buildings and categorize by type
    for (const building of this.buildings) {
      const dx = building.position.x - npcPosition.x;
      const dz = building.position.z - npcPosition.z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      if (dist < 15) {
        const tag = building.buildingType;
        const list = nearbyObjects.get(tag) ?? [];
        list.push(building.id);
        nearbyObjects.set(tag, list);
      }
    }

    // Find nearby resource nodes and categorize by tags
    for (const node of this.resourceNodes) {
      const dx = node.position.x - npcPosition.x;
      const dz = node.position.z - npcPosition.z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      if (dist < 20) {
        // Add by resource type
        const typeList = nearbyObjects.get(node.resourceType) ?? [];
        typeList.push(node.id);
        nearbyObjects.set(node.resourceType, typeList);

        // Add by tags
        if (node.tags) {
          for (const tag of node.tags) {
            const tagList = nearbyObjects.get(tag) ?? [];
            tagList.push(node.id);
            nearbyObjects.set(tag, tagList);
          }
        }
      }
    }

    // Find nearby props and categorize by tags
    const props = this.mapData?.props ?? [];
    for (const prop of props) {
      const dx = prop.position.x - npcPosition.x;
      const dz = prop.position.z - npcPosition.z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      if (dist < 15 && prop.tags) {
        for (const tag of prop.tags) {
          const tagList = nearbyObjects.get(tag) ?? [];
          tagList.push(prop.id);
          nearbyObjects.set(tag, tagList);
        }
      }
    }

    // Find nearby NPCs
    for (const other of movableNpcs) {
      if (other.id === npc.id) continue;
      const dx = other.position.x - npcPosition.x;
      const dz = other.position.z - npcPosition.z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      if (dist < 10) {
        nearbyCharacters.push(other.id);
      }
    }

    const context = {
      characterId: npc.id,
      currentTick: this.tick,
      hasItem: (_itemCode: string) => false, // TODO: implement inventory
      hasMoney: (_amount: number) => false, // TODO: implement money
      getNearbyObjects: (tag: string) => nearbyObjects.get(tag) ?? [],
      getNearbyCharacters: () => nearbyCharacters,
      getCurrentAction: () => this.actionExecutor.getCurrentActionCode(npc.id),
    };

    // Use behavior tree to select action
    const result = this.behaviorTree.selectAction(npc.id, context);
    if (!result.actionCode) return;

    const def = this.actionRegistry.get(result.actionCode);
    if (!def) return;

    // Determine target position
    const options: { targetId?: string | undefined; targetPosition?: Vec3 | undefined } = {};

    if (result.targetId) {
      options.targetId = result.targetId;
      // Find position of target
      const targetBuilding = this.buildings.find((b) => b.id === result.targetId);
      if (targetBuilding) {
        options.targetPosition = { ...targetBuilding.position };
      } else {
        const targetNpc = this.npcs.find((n) => n.id === result.targetId);
        if (targetNpc) {
          options.targetPosition = { ...targetNpc.position };
        }
      }
    } else if (def.targetType === 'point') {
      const wp = this.moveWaypoints[Math.floor(Math.random() * this.moveWaypoints.length)];
      if (wp) options.targetPosition = { ...wp };
    }

    this.actionExecutor.startAction(npc.id, result.actionCode, this.tick, options);

    // Apply need effects when action starts
    this.needsSystem.applyActionEffects(npc.id, result.actionCode);
  }

  private emit(event: QtownWorldEvent): void {
    for (const listener of this.deltaListeners) {
      listener(event);
    }
  }

  subscribe(listener: DeltaListener): () => void {
    this.deltaListeners.add(listener);
    return () => this.deltaListeners.delete(listener);
  }

  setViewerCount(count: number): void {
    this.viewerCount = count;
  }

  getStatus(): WorldRuntimeStatus {
    return {
      worldId: this.worldId,
      status: this.runtimeStatus,
      simulationMode: this.viewerCount > 0 ? 'ONLINE_REALTIME' : 'OFFLINE_LOW_FREQ',
      viewerCount: this.viewerCount,
      gameTime: this.clock.gameTime,
    };
  }

  getSnapshot(): QtownWorldSnapshot {
    const time = this.clockToGameTime();
    return {
      worldId: this.worldId,
      mapId: this.mapData?.id ?? 'qtown_v0_1',
      tick: this.tick,
      time,
      npcs: this.npcs.map((n) => {
        const copy = { ...n, position: { ...n.position } };
        // Enrich with action system state
        const runningAction = this.actionExecutor.getRunningAction(n.id);
        if (runningAction && runningAction.status === 'running') {
          copy.currentAction = runningAction.context.actionCode;
          copy.status = 'working';
        }
        return copy;
      }),
      buildings: this.buildings.map((b) => {
        const copy: BuildingState = {
          id: b.id,
          assetId: b.assetId,
          buildingType: b.buildingType,
          displayName: b.displayName,
          position: { ...b.position },
          status: b.status,
        };
        if (b.rotation) copy.rotation = { ...b.rotation };
        if (b.roofMode) copy.roofMode = b.roofMode;
        return copy;
      }),
      resourceNodes: buildSnapshot(this.mapData, this.tick, time).resourceNodes,
      props: buildSnapshot(this.mapData, this.tick, time).props,
    };
  }

  private clockToGameTime(): WorldTime {
    const gt = this.clock.gameTime;
    return {
      day: gt.day,
      hour: gt.hour,
      minute: gt.minute,
    };
  }
}
