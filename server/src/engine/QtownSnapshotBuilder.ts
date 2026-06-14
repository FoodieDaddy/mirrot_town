/**
 * Builds a QtownWorldSnapshot from the qtown_v0_1.json map file.
 * The map JSON is the static layout; the snapshot is the runtime world state.
 */
import type {
  BuildingState,
  NpcState,
  PropState,
  QtownWorldSnapshot,
  ResourceNodeState,
  Vec3,
  WorldTime,
} from '@jingzhong-biancheng/shared';

interface MapNpcSpawn {
  id: string;
  assetId: string;
  position: Vec3;
  name?: string;
  displayName?: string;
  role?: string;
}

interface MapBuilding {
  id: string;
  assetId: string;
  position: Vec3;
  rotation?: Vec3;
  buildingType: string;
  displayName: string;
  roof?: { mode?: string; hideable?: boolean };
}

interface MapResourceNode {
  id: string;
  assetId: string;
  position: Vec3;
  resourceType?: string;
  displayName?: string;
  amount?: number;
  maxAmount?: number;
}

interface MapProp {
  id: string;
  assetId: string;
  position: Vec3;
  rotation?: Vec3;
  scale?: number;
}

interface MapData {
  id: string;
  buildings: MapBuilding[];
  resourceNodes: MapResourceNode[];
  props: MapProp[];
  npcSpawns: MapNpcSpawn[];
}

const VALID_BUILDING_TYPES = new Set<string>([
  'townhall',
  'shop',
  'workshop',
  'warehouse',
  'house',
]);

const VALID_RESOURCE_TYPES = new Set<string>(['tree', 'stone', 'wood', 'water', 'food']);

const VALID_BUILDING_STATUS = new Set<string>([
  'normal',
  'under_construction',
  'damaged',
  'closed',
]);

export function buildSnapshot(mapData: MapData, tick: number, time: WorldTime): QtownWorldSnapshot {
  const npcs: NpcState[] = (mapData.npcSpawns || []).map((spawn) => ({
    id: spawn.id,
    displayName: spawn.displayName || spawn.name || spawn.id,
    assetId: spawn.assetId,
    role: spawn.role,
    position: { ...spawn.position },
    status: 'idle' as const,
  }));

  const buildings: BuildingState[] = (mapData.buildings || []).map((b) => {
    const building: BuildingState = {
      id: b.id,
      assetId: b.assetId,
      buildingType: VALID_BUILDING_TYPES.has(b.buildingType)
        ? (b.buildingType as BuildingState['buildingType'])
        : 'house',
      displayName: b.displayName,
      position: { ...b.position },
      status: 'normal' as const,
    };
    if (b.rotation) building.rotation = { ...b.rotation };
    if (b.roof?.mode === 'hidden' || b.roof?.mode === 'normal') {
      building.roofMode = b.roof.mode;
    }
    return building;
  });

  const resourceNodes: ResourceNodeState[] = (mapData.resourceNodes || []).map((r) => ({
    id: r.id,
    assetId: r.assetId,
    resourceType: VALID_RESOURCE_TYPES.has(r.resourceType ?? '')
      ? (r.resourceType as ResourceNodeState['resourceType'])
      : 'tree',
    displayName: r.displayName || r.id,
    position: { ...r.position },
    amount: r.amount ?? 100,
    maxAmount: r.maxAmount ?? 100,
  }));

  const props: PropState[] = (mapData.props || []).map((p) => {
    const prop: PropState = {
      id: p.id,
      assetId: p.assetId,
      position: { ...p.position },
    };
    if (p.rotation) prop.rotation = { ...p.rotation };
    if (p.scale !== undefined) prop.scale = p.scale;
    return prop;
  });

  return {
    worldId: 'qtown_v0_1',
    mapId: mapData.id,
    tick,
    time,
    npcs,
    buildings,
    resourceNodes,
    props,
  };
}
