import fs from 'node:fs/promises';
import path from 'node:path';
import type {
  CharacterMovedChange,
  CharacterViewState,
  WorldDelta,
  WorldSnapshot,
} from '@jingzhong-biancheng/shared';

import { WorldClock, type GameTime } from './WorldClock.js';

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

type RuntimeCharacter = CharacterViewState;

type DeltaListener = (delta: WorldDelta) => void;

interface WorldSeed {
  worldId: string;
  name: string;
  renderMode: string;
  map: {
    metadata: string;
    assets: string;
    navGrid: string;
    regions: string;
    elements: string;
  };
  characters: string;
  characterAssets: string;
}

export class WorldRuntime {
  readonly worldId: string;
  readonly clock: WorldClock;

  private readonly now: () => number;
  private characters: RuntimeCharacter[] = [];
  private mapMetadata: any = null;
  private navGrid: any = null;
  private regions: any[] = [];
  private elements: any[] = [];
  private characterAssets: any[] = [];
  private assetManifest: any = null;
  private readonly deltaListeners = new Set<DeltaListener>();
  private runtimeStatus: RuntimeStatus = 'STOPPED';
  private snapshotVersion = 1;
  private sequence = 0;
  private viewerCount = 0;

  constructor(options: WorldRuntimeOptions = {}) {
    this.worldId = options.worldId ?? 'default';
    this.clock = options.clock ?? new WorldClock();
    this.now = options.now ?? Date.now;
  }

  async load(seedPath: string): Promise<void> {
    const mapData = JSON.parse(await fs.readFile(seedPath, 'utf-8'));
    this.mapMetadata = mapData;

    const spawnPositions = mapData.npcSpawns || [];

    // Initialize characters from npcSpawns
    this.characters = spawnPositions.map((spawn: any, index: number) => {
      return {
        characterId: spawn.id,
        name: `NPC ${index}`,
        transform: { x: spawn.position?.x || 0, y: spawn.position?.z || 0 }, // Using Z as Y on server logic
        state: { mood: '平常' },
      };
    });

    if (this.characters.length === 0) {
      this.characters.push({
        characterId: 'npc_fallback',
        name: 'Fallback NPC',
        transform: { x: 0, y: 0 },
        state: { mood: '平常' },
      });
    }
  }

  start(): void {
    if (this.runtimeStatus === 'RUNNING') {
      return;
    }

    this.runtimeStatus = 'RUNNING';
    this.clock.start(() => this.tick());
  }

  stop(): void {
    this.clock.stop();
    this.runtimeStatus = 'STOPPED';
  }

  get currentSeq(): number {
    return this.sequence;
  }

  tick(): CharacterMovedChange {
    if (this.characters.length === 0) {
      // Return a dummy change if no characters
      return {
        type: 'character_moved',
        characterId: 'none',
        from: { x: 0, y: 0 },
        to: { x: 0, y: 0 },
        durationMs: 0,
      };
    }
    const characterIndex = this.clock.currentTick % this.characters.length;
    const character = this.characters[characterIndex];

    if (!character) {
      throw new Error('WorldRuntime requires at least one character');
    }

    const from = { ...character.transform };

    // Simple random walk within bounds
    let dx = Math.floor(Math.random() * 3) - 1; // -1, 0, 1
    let dy = Math.floor(Math.random() * 3) - 1;

    // Try to stay walkable
    let toX = Math.max(0, Math.min(this.mapMetadata?.gridWidth - 1 || 40, from.x + dx));
    let toY = Math.max(0, Math.min(this.mapMetadata?.gridHeight - 1 || 40, from.y + dy));

    if (this.navGrid && this.navGrid.walkable) {
      if (this.navGrid.walkable[toY]?.[toX] !== 1) {
        // If next step is not walkable, try other directions or just stay
        toX = from.x;
        toY = from.y;
        dx = 0;
        dy = 0;
      }
    }

    const to = { x: toX, y: toY };

    // Determine direction
    let direction = (character.state as any)?.direction || 'down';
    if (dx < 0) direction = 'left';
    else if (dx > 0) direction = 'right';
    else if (dy < 0) direction = 'up';
    else if (dy > 0) direction = 'down';

    // Randomly assign statusIcon
    let statusIcon = (character.state as any)?.statusIcon;
    if (Math.random() < 0.05) {
      const icons = ['💭', '😊', '💤', '📍', '🔥', '🍵'];
      statusIcon = icons[Math.floor(Math.random() * icons.length)];
    } else if (Math.random() < 0.1) {
      statusIcon = null;
    }

    character.transform = to;
    character.state = {
      ...character.state,
      direction,
      isMoving: dx !== 0 || dy !== 0,
      statusIcon,
    };
    this.clock.advance();
    this.snapshotVersion += 1;
    this.sequence += 1;

    const delta: CharacterMovedChange = {
      type: 'character_moved',
      characterId: character.characterId,
      from,
      to,
      durationMs: this.clock.tickIntervalMs,
    };

    const worldDelta: WorldDelta = {
      type: 'world_delta',
      worldId: this.worldId,
      seq: this.sequence,
      serverTime: this.now(),
      gameTime: this.clock.gameTime,
      changes: [delta],
    };

    for (const listener of this.deltaListeners) {
      listener(worldDelta);
    }

    return delta;
  }

  subscribe(listener: DeltaListener): () => void {
    this.deltaListeners.add(listener);
    return () => this.deltaListeners.delete(listener);
  }

  setViewerCount(viewerCount: number): void {
    this.viewerCount = viewerCount;
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

  getSnapshot(): WorldSnapshot {
    return {
      type: 'world_snapshot',
      worldId: this.worldId,
      snapshotVersion: this.snapshotVersion,
      seq: this.sequence,
      serverTime: this.now(),
      gameTime: this.clock.gameTime,
      map: {
        id: this.mapMetadata?.id || 'qtown_v0_1',
      },
      regions: [],
      objects: [],
      characters: this.characters.map((character) => ({
        ...character,
        transform: { ...character.transform },
      })),
      animals: [],
      publicEvents: [],
    };
  }
}
