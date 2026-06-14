import type { Transform } from "../map/Transform.js";

export interface ActionPhaseViewState {
  phaseCode: string;
  durationMs: number;
}

export interface CharacterActionViewState {
  actionCode: string;
  startedAt: number;
  durationMs?: number;
  targetObjectId?: string;
  targetCharacterId?: string;
  targetRegionId?: string;
  phases?: readonly ActionPhaseViewState[];
}

export interface CharacterViewState {
  characterId: string;
  transform: Transform;
  name?: string;
  regionId?: string;
  direction?: string;
  currentAction?: CharacterActionViewState;
  state?: Readonly<Record<string, unknown>>;
}
