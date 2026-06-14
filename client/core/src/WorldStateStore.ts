import type {
  CharacterViewState,
  GameTime,
  PublicWorldEvent,
  WorldDelta,
  WorldObject,
  WorldSnapshot,
} from '@jingzhong-biancheng/shared';

export interface SequenceGap {
  expectedSeq: number | null;
  receivedSeq: number;
}

export interface WorldState {
  worldId: string | null;
  snapshotVersion: number | null;
  serverTime: number | null;
  gameTime: GameTime | null;
  map: Readonly<Record<string, unknown>> | null;
  assets?: any;
  characters: ReadonlyMap<string, CharacterViewState>;
  objects: ReadonlyMap<string, WorldObject>;
  publicEvents: readonly PublicWorldEvent[];
  lastSeq: number | null;
  sequenceGap: SequenceGap | null;
}

export type DeltaApplyResult =
  | { status: 'applied'; receivedSeq: number }
  | { status: 'duplicate'; receivedSeq: number }
  | { status: 'gap'; expectedSeq: number | null; receivedSeq: number };

export type WorldStateListener = (state: WorldState) => void;

const emptyState = (): WorldState => ({
  worldId: null,
  snapshotVersion: null,
  serverTime: null,
  gameTime: null,
  map: null,
  characters: new Map(),
  objects: new Map(),
  publicEvents: [],
  lastSeq: null,
  sequenceGap: null,
});

export class WorldStateStore {
  private state: WorldState = emptyState();
  private readonly listeners = new Set<WorldStateListener>();

  constructor(snapshot?: WorldSnapshot) {
    if (snapshot) {
      this.applySnapshot(snapshot);
    }
  }

  applySnapshot(snapshot: WorldSnapshot): void {
    this.state = {
      worldId: snapshot.worldId,
      snapshotVersion: snapshot.snapshotVersion,
      serverTime: snapshot.serverTime,
      gameTime: snapshot.gameTime,
      map: snapshot.map ?? null,
      assets: (snapshot as any).assets ?? null,
      characters: new Map(
        snapshot.characters.map((character) => [character.characterId, character])
      ),
      objects: new Map(snapshot.objects.map((object) => [object.objectId, object])),
      publicEvents: snapshot.publicEvents ?? [],
      lastSeq: snapshot.seq,
      sequenceGap: null,
    };
    this.notify();
  }

  applyDelta(delta: WorldDelta): DeltaApplyResult {
    if (this.state.worldId !== null && delta.worldId !== this.state.worldId) {
      throw new Error(
        `Cannot apply delta for world "${delta.worldId}" to "${this.state.worldId}".`
      );
    }

    if (this.state.sequenceGap !== null) {
      return {
        status: 'gap',
        expectedSeq: this.state.sequenceGap.expectedSeq,
        receivedSeq: delta.seq,
      };
    }

    const lastSeq = this.state.lastSeq;
    if (lastSeq !== null && delta.seq <= lastSeq) {
      return { status: 'duplicate', receivedSeq: delta.seq };
    }

    const expectedSeq = lastSeq === null ? null : lastSeq + 1;
    if (expectedSeq === null || delta.seq !== expectedSeq) {
      this.state = {
        ...this.state,
        sequenceGap: { expectedSeq, receivedSeq: delta.seq },
      };
      this.notify();
      return { status: 'gap', expectedSeq, receivedSeq: delta.seq };
    }

    let characters = new Map(this.state.characters);
    let objects = new Map(this.state.objects);
    let publicEvents = this.state.publicEvents;

    for (const change of delta.changes) {
      switch (change.type) {
        case 'character_moved': {
          const character = characters.get(change.characterId);
          if (character) {
            characters.set(change.characterId, {
              ...character,
              transform: change.to,
            });
          }
          break;
        }
        case 'character_action_started': {
          const character = characters.get(change.characterId);
          if (character) {
            characters.set(change.characterId, {
              ...character,
              currentAction: {
                actionCode: change.actionCode,
                startedAt: delta.serverTime,
                ...(change.durationMs === undefined ? {} : { durationMs: change.durationMs }),
                ...(change.targetObjectId === undefined
                  ? {}
                  : { targetObjectId: change.targetObjectId }),
                ...(change.targetCharacterId === undefined
                  ? {}
                  : { targetCharacterId: change.targetCharacterId }),
                ...(change.targetRegionId === undefined
                  ? {}
                  : { targetRegionId: change.targetRegionId }),
                ...(change.phases === undefined ? {} : { phases: change.phases }),
              },
            });
          }
          break;
        }
        case 'object_added': {
          objects.set(change.objectId, {
            objectId: change.objectId,
            templateId: change.templateId,
            regionId: change.regionId,
            transform: change.position,
            state: change.state,
            ...(change.enabled === undefined ? {} : { enabled: change.enabled }),
          });
          break;
        }
        case 'object_state_changed': {
          const object = objects.get(change.objectId);
          if (object) {
            objects.set(change.objectId, {
              ...object,
              state: { ...object.state, ...change.patch },
            });
          }
          break;
        }
        case 'event_created':
          publicEvents = [...publicEvents, change.event];
          break;
      }
    }

    this.state = {
      ...this.state,
      worldId: delta.worldId,
      serverTime: delta.serverTime,
      gameTime: delta.gameTime ?? this.state.gameTime,
      characters,
      objects,
      publicEvents,
      lastSeq: delta.seq,
    };
    this.notify();

    return { status: 'applied', receivedSeq: delta.seq };
  }

  subscribe(listener: WorldStateListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  getState(): WorldState {
    return this.state;
  }

  getCharacter(characterId: string): CharacterViewState | undefined {
    return this.state.characters.get(characterId);
  }

  getObject(objectId: string): WorldObject | undefined {
    return this.state.objects.get(objectId);
  }

  getCharacters(): readonly CharacterViewState[] {
    return [...this.state.characters.values()];
  }

  getObjects(): readonly WorldObject[] {
    return [...this.state.objects.values()];
  }

  hasSequenceGap(): boolean {
    return this.state.sequenceGap !== null;
  }

  private notify(): void {
    for (const listener of this.listeners) {
      listener(this.state);
    }
  }
}
