/**
 * QTown World Protocol — v0.1 snapshot/event/command types
 * for the "backend drives frontend" phase.
 */

// ─── Primitives ────────────────────────────────────────────

export type Vec3 = {
  x: number;
  y: number;
  z: number;
};

// ─── Snapshot ───────────────────────────────────────────────

export type WorldTime = {
  day: number;
  hour: number;
  minute: number;
};

export type NpcState = {
  id: string;
  displayName: string;
  assetId: string;
  role?: string | undefined;
  position: Vec3;
  targetPosition?: Vec3 | undefined;
  facing?: number | undefined;
  status?: 'idle' | 'walking' | 'working' | 'talking' | undefined;
  currentAction?: string | undefined;
};

export type BuildingState = {
  id: string;
  assetId: string;
  buildingType: 'townhall' | 'shop' | 'workshop' | 'warehouse' | 'house';
  displayName: string;
  position: Vec3;
  rotation?: Vec3 | undefined;
  status: 'normal' | 'under_construction' | 'damaged' | 'closed';
  roofMode?: 'normal' | 'hidden' | undefined;
};

export type ResourceNodeState = {
  id: string;
  assetId: string;
  resourceType: 'tree' | 'stone' | 'wood' | 'water' | 'food';
  displayName: string;
  position: Vec3;
  amount: number;
  maxAmount: number;
};

export type PropState = {
  id: string;
  assetId: string;
  position: Vec3;
  rotation?: Vec3 | undefined;
  scale?: number | undefined;
};

export type WorldSnapshot = {
  worldId: string;
  mapId: string;
  tick: number;
  time: WorldTime;
  npcs: NpcState[];
  buildings: BuildingState[];
  resourceNodes: ResourceNodeState[];
  props: PropState[];
};

// ─── Events (server → client) ──────────────────────────────

export type NpcMovedEvent = {
  type: 'npc_moved';
  npcId: string;
  position: Vec3;
  targetPosition?: Vec3 | undefined;
  status?: NpcState['status'];
};

export type NpcActionChangedEvent = {
  type: 'npc_action_changed';
  npcId: string;
  currentAction: string;
  status: NpcState['status'];
};

export type BuildingUpdatedEvent = {
  type: 'building_updated';
  buildingId: string;
  status?: BuildingState['status'] | undefined;
  roofMode?: BuildingState['roofMode'] | undefined;
};

export type ResourceUpdatedEvent = {
  type: 'resource_updated';
  resourceNodeId: string;
  amount: number;
};

export type WorldEvent =
  | NpcMovedEvent
  | NpcActionChangedEvent
  | BuildingUpdatedEvent
  | ResourceUpdatedEvent;

// ─── Commands (client → server) ────────────────────────────

export type MovePlayerCommand = {
  type: 'move_player';
  target: Vec3;
};

export type SelectBuildingCommand = {
  type: 'select_building';
  buildingId: string;
};

export type SetRoofModeCommand = {
  type: 'set_roof_mode';
  buildingId: string;
  roofMode: 'normal' | 'hidden';
};

export type InteractCommand = {
  type: 'interact';
  entityId: string;
  interactionType: string;
};

export type WorldCommand =
  | MovePlayerCommand
  | SelectBuildingCommand
  | SetRoofModeCommand
  | InteractCommand;
