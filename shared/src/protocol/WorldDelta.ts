import type { ActionPhaseViewState } from "../characters/CharacterViewState.js";
import type { Transform } from "../map/Transform.js";
import type { GameTime } from "../time/GameTime.js";
import type { PublicWorldEvent } from "./WorldSnapshot.js";

export interface CharacterMovedChange {
  type: "character_moved";
  characterId: string;
  from: Transform;
  to: Transform;
  durationMs: number;
}

export interface CharacterActionStartedChange {
  type: "character_action_started";
  characterId: string;
  actionCode: string;
  durationMs?: number;
  targetObjectId?: string;
  targetCharacterId?: string;
  targetRegionId?: string;
  phases?: readonly ActionPhaseViewState[];
}

export interface ObjectAddedChange {
  type: "object_added";
  objectId: string;
  templateId: string;
  regionId: string;
  position: Transform;
  state: Readonly<Record<string, unknown>>;
  enabled?: boolean;
}

export interface ObjectStateChangedChange {
  type: "object_state_changed";
  objectId: string;
  patch: Readonly<Record<string, unknown>>;
}

export interface EventCreatedChange {
  type: "event_created";
  event: PublicWorldEvent;
}

export type WorldDeltaChange =
  | CharacterMovedChange
  | CharacterActionStartedChange
  | ObjectAddedChange
  | ObjectStateChangedChange
  | EventCreatedChange;

export interface WorldDelta {
  type: "world_delta";
  worldId: string;
  seq: number;
  serverTime: number;
  gameTime?: GameTime;
  changes: readonly WorldDeltaChange[];
}
