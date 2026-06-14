import fs from 'node:fs/promises';
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

  private readonly now: () => number;
  private mapData: any = null;
  private npcs: NpcState[] = [];
  private buildings: BuildingState[] = [];
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
  }

  async load(seedPath: string): Promise<void> {
    const raw = await fs.readFile(seedPath, 'utf-8');
    this.mapData = JSON.parse(raw);

    const time = this.clockToGameTime();
    const snapshot = buildSnapshot(this.mapData, this.tick, time);
    this.npcs = [...snapshot.npcs];
    this.buildings = [...snapshot.buildings];

    // Define waypoints around plaza and roads for NPC wandering
    this.moveWaypoints = this.buildWaypoints();
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

    // Every ~30 ticks (6 seconds at 5 tps), move a non-player NPC
    if (this.tick % 5 === 0) {
      this.moveOneNpc();
    }
  }

  private moveOneNpc(): void {
    // Pick a random non-player NPC
    const movableNpcs = this.npcs.filter((n) => n.role !== 'player');
    if (movableNpcs.length === 0) return;

    const npc = movableNpcs[Math.floor(Math.random() * movableNpcs.length)];
    if (!npc) return;

    // Pick a random waypoint as target
    const target = this.moveWaypoints[Math.floor(Math.random() * this.moveWaypoints.length)];
    if (!target) return;

    const from = { ...npc.position };
    npc.targetPosition = { ...target };
    npc.status = 'walking';

    const event: NpcMovedEvent = {
      type: 'npc_moved',
      npcId: npc.id,
      position: from,
      targetPosition: { ...target },
      status: 'walking',
    };

    this.emit(event);

    // Schedule arrival after a delay (simulated by next check)
    // In a real system we'd track animation time; for now set idle after a few ticks
    const distance = Math.sqrt((target.x - from.x) ** 2 + (target.z - from.z) ** 2);
    const ticksToArrive = Math.max(3, Math.round(distance * 2));

    // Use setTimeout to simulate arrival
    setTimeout(() => {
      npc.position = { ...target };
      delete (npc as any).targetPosition;
      npc.status = 'idle';
      npc.facing = Math.atan2(target.x - from.x, target.z - from.z);

      this.emit({
        type: 'npc_moved',
        npcId: npc.id,
        position: { ...target },
        status: 'idle',
      });
    }, ticksToArrive * this.clock.tickIntervalMs);
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
      npcs: this.npcs.map((n) => ({ ...n, position: { ...n.position } })),
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
