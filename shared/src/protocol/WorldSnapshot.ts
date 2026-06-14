import type { CharacterViewState } from '../characters/CharacterViewState.js';
import type { WorldObject } from '../objects/WorldObject.js';
import type { GameTime } from '../time/GameTime.js';

export interface WorldSnapshot {
  type: 'world_snapshot';
  worldId: string;
  snapshotVersion: number;
  seq: number;
  serverTime: number;
  gameTime: GameTime;
  characters: readonly CharacterViewState[];
  objects: readonly WorldObject[];
  map?: Readonly<Record<string, unknown>>;
  regions?: readonly Readonly<Record<string, unknown>>[];
  animals?: readonly Readonly<Record<string, unknown>>[];
  publicEvents?: readonly PublicWorldEvent[];
}

export interface PublicWorldEvent {
  eventCode: string;
  text: string;
  actorId?: string;
  targetCharacterId?: string;
  objectId?: string;
  regionId?: string;
  visibility?: string;
  [key: string]: unknown;
}
