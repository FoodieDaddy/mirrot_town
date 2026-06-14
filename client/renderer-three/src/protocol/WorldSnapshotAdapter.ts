/**
 * WorldSnapshotAdapter
 * Converts a QtownWorldSnapshot into Three.js entity state for the renderer.
 */
import type {
  BuildingState,
  NpcState,
  PropState,
  QtownWorldSnapshot,
  ResourceNodeState,
} from '@jingzhong-biancheng/shared';

export interface NpcEntityState {
  id: string;
  displayName: string;
  assetId: string;
  role: string | undefined;
  position: { x: number; y: number; z: number };
  targetPosition: { x: number; y: number; z: number } | undefined;
  facing: number | undefined;
  status: 'idle' | 'walking' | 'working' | 'talking' | undefined;
  currentAction: string | undefined;
}

export interface BuildingEntityState {
  id: string;
  assetId: string;
  buildingType: string;
  displayName: string;
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number } | undefined;
  status: string;
  roofMode: 'normal' | 'hidden' | undefined;
}

export interface ResourceNodeEntityState {
  id: string;
  assetId: string;
  resourceType: string;
  displayName: string;
  position: { x: number; y: number; z: number };
  amount: number;
  maxAmount: number;
}

export interface PropEntityState {
  id: string;
  assetId: string;
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number } | undefined;
  scale: number | undefined;
}

export interface SnapshotEntityState {
  worldId: string;
  mapId: string;
  tick: number;
  npcs: NpcEntityState[];
  buildings: BuildingEntityState[];
  resourceNodes: ResourceNodeEntityState[];
  props: PropEntityState[];
}

export function adaptSnapshot(snapshot: QtownWorldSnapshot): SnapshotEntityState {
  return {
    worldId: snapshot.worldId,
    mapId: snapshot.mapId,
    tick: snapshot.tick,
    npcs: snapshot.npcs.map(adaptNpc),
    buildings: snapshot.buildings.map(adaptBuilding),
    resourceNodes: snapshot.resourceNodes.map(adaptResourceNode),
    props: snapshot.props.map(adaptProp),
  };
}

function adaptNpc(npc: NpcState): NpcEntityState {
  return {
    id: npc.id,
    displayName: npc.displayName,
    assetId: npc.assetId,
    role: npc.role,
    position: { ...npc.position },
    targetPosition: npc.targetPosition ? { ...npc.targetPosition } : undefined,
    facing: npc.facing,
    status: npc.status,
    currentAction: npc.currentAction,
  };
}

function adaptBuilding(b: BuildingState): BuildingEntityState {
  return {
    id: b.id,
    assetId: b.assetId,
    buildingType: b.buildingType,
    displayName: b.displayName,
    position: { ...b.position },
    rotation: b.rotation ? { ...b.rotation } : undefined,
    status: b.status,
    roofMode: b.roofMode,
  };
}

function adaptResourceNode(r: ResourceNodeState): ResourceNodeEntityState {
  return {
    id: r.id,
    assetId: r.assetId,
    resourceType: r.resourceType,
    displayName: r.displayName,
    position: { ...r.position },
    amount: r.amount,
    maxAmount: r.maxAmount,
  };
}

function adaptProp(p: PropState): PropEntityState {
  return {
    id: p.id,
    assetId: p.assetId,
    position: { ...p.position },
    rotation: p.rotation ? { ...p.rotation } : undefined,
    scale: p.scale,
  };
}
