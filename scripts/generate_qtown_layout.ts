import fs from 'fs/promises';
import path from 'path';

async function main() {
  console.log('Generating Lived-in Q-Town v0.1 layout (Town Path System Mode)...');

  const mapData: any = {
    id: 'qtown_v0_1',
    name: 'Q Town v0.1',
    style: 'q-low-poly-cartoon',
    camera: {
      type: 'orthographic',
      angle: { x: 60, y: 0, z: 45 },
      zoom: 1,
    },
    size: { width: 64, depth: 64 },
    spawn: { player: { x: 0, y: 0, z: 0 } },
    buildings: [
      {
        id: 'b_townhall',
        assetId: 'building_townhall_001',
        position: { x: 0, y: 0, z: -12 },
        rotation: { x: 0, y: 0, z: 0 },
        buildingType: 'townhall',
        displayName: '小镇大厅',
        entrance: { x: 0, y: 0, z: -10 },
        indoorArea: { enabled: false, width: 6, depth: 6 },
        roof: { hideable: true, mode: 'normal' },
      },
      {
        id: 'b_shop',
        assetId: 'building_shop_001',
        position: { x: -12, y: 0, z: -2 },
        rotation: { x: 0, y: 1.57, z: 0 },
        buildingType: 'shop',
        displayName: '杂货铺',
        entrance: { x: -10, y: 0, z: -2 },
        indoorArea: { enabled: false, width: 4, depth: 4 },
        roof: { hideable: true, mode: 'normal' },
      },
      {
        id: 'b_workshop',
        assetId: 'building_workshop_001',
        position: { x: 12, y: 0, z: -2 },
        rotation: { x: 0, y: -1.57, z: 0 },
        buildingType: 'workshop',
        displayName: '铁匠工房',
        entrance: { x: 10, y: 0, z: -2 },
        indoorArea: { enabled: false, width: 4, depth: 4 },
        roof: { hideable: true, mode: 'normal' },
      },
      {
        id: 'b_warehouse',
        assetId: 'building_warehouse_001',
        position: { x: -12, y: 0, z: 9 },
        rotation: { x: 0, y: 1.57, z: 0 },
        buildingType: 'warehouse',
        displayName: '镇中心仓库',
        entrance: { x: -10, y: 0, z: 9 },
        indoorArea: { enabled: false, width: 5, depth: 5 },
        roof: { hideable: true, mode: 'normal' },
      },
      {
        id: 'b_house1',
        assetId: 'building_house_wood_001',
        position: { x: 6, y: 0, z: 10 },
        rotation: { x: 0, y: 0, z: 0 },
        buildingType: 'house',
        displayName: '老周家',
        entrance: { x: 6, y: 0, z: 8 },
        indoorArea: { enabled: false, width: 3, depth: 3 },
        roof: { hideable: true, mode: 'normal' },
      },
      {
        id: 'b_house2',
        assetId: 'building_house_wood_002',
        position: { x: 12, y: 0, z: 10 },
        rotation: { x: 0, y: 0, z: 0 },
        buildingType: 'house',
        displayName: '小禾家',
        entrance: { x: 12, y: 0, z: 8 },
        indoorArea: { enabled: false, width: 3, depth: 3 },
        roof: { hideable: true, mode: 'normal' },
      },
      {
        id: 'b_house3',
        assetId: 'building_house_wood_003',
        position: { x: -4, y: 0, z: 13 },
        rotation: { x: 0, y: 3.14, z: 0 },
        buildingType: 'house',
        displayName: '阿木家',
        entrance: { x: -4, y: 0, z: 11 },
        indoorArea: { enabled: false, width: 3, depth: 3 },
        roof: { hideable: true, mode: 'normal' },
      },
      {
        id: 'b_house4',
        assetId: 'building_house_wood_004',
        position: { x: 2, y: 0, z: 14 },
        rotation: { x: 0, y: 3.14, z: 0 },
        buildingType: 'house',
        displayName: '阿青家',
        entrance: { x: 2, y: 0, z: 12 },
        indoorArea: { enabled: false, width: 3, depth: 3 },
        roof: { hideable: true, mode: 'normal' },
      },
    ],
    roads: [] as any[],
    props: [
      // Plaza Landmark (Center Market Combo - table + crates + barrel)
      { id: 'p_landmark_table', assetId: 'prop_table_001', position: { x: 0, y: 0, z: 0 } },
      { id: 'p_landmark_crate1', assetId: 'prop_crate_001', position: { x: -1.2, y: 0, z: 0.5 } },
      { id: 'p_landmark_barrel1', assetId: 'prop_barrel_001', position: { x: 1.2, y: 0, z: 0.5 } },
      {
        id: 'p_plaza_bench1',
        assetId: 'prop_bench_001',
        position: { x: -3, y: 0, z: 3 },
        rotation: { x: 0, y: 0.78, z: 0 },
      },
      { id: 'p_plaza_bench2', assetId: 'prop_bench_001', position: { x: 0, y: 0, z: -4 } },

      // Shop Entrance (crates, barrel, shelf)
      { id: 'p_shop_crate1', assetId: 'prop_crate_001', position: { x: -10, y: 0, z: -4 } },
      { id: 'p_shop_crate2', assetId: 'prop_crate_001', position: { x: -9.2, y: 0, z: -4 } },
      { id: 'p_shop_barrel1', assetId: 'prop_barrel_001', position: { x: -10, y: 0, z: 0 } },
      { id: 'p_shop_table', assetId: 'prop_table_001', position: { x: -13, y: 0, z: -5 } },
      { id: 'p_shop_shelf', assetId: 'prop_crate_001', position: { x: -13.5, y: 0, z: -2 } },

      // Workshop Entrance (table, barrel, wood stack, crate)
      { id: 'p_ws_table', assetId: 'prop_table_001', position: { x: 10, y: 0, z: -4 } },
      { id: 'p_ws_barrel1', assetId: 'prop_barrel_001', position: { x: 10, y: 0, z: 0 } },
      { id: 'p_ws_woodstack', assetId: 'prop_wood_stack_001', position: { x: 13.5, y: 0, z: 0 } },
      { id: 'p_ws_crate1', assetId: 'prop_crate_001', position: { x: 13.5, y: 0, z: -1 } },

      // Warehouse Entrance (crate group + barrels)
      { id: 'p_wh_c1', assetId: 'prop_crate_001', position: { x: -10, y: 0, z: 8 } },
      { id: 'p_wh_c2', assetId: 'prop_crate_001', position: { x: -9.2, y: 0, z: 8 } },
      { id: 'p_wh_c3', assetId: 'prop_crate_001', position: { x: -10, y: 0.6, z: 8 } },
      { id: 'p_wh_b1', assetId: 'prop_barrel_001', position: { x: -10, y: 0, z: 11 } },
      { id: 'p_wh_b2', assetId: 'prop_barrel_001', position: { x: -9, y: 0, z: 10.5 } },
      { id: 'p_wh_c4', assetId: 'prop_crate_001', position: { x: -10.5, y: 0.6, z: 10 } },

      // Residential (chairs, barrel, flower crate near doors)
      { id: 'p_h1_chair', assetId: 'prop_chair_001', position: { x: 5, y: 0, z: 8 } },
      { id: 'p_h2_barrel', assetId: 'prop_barrel_001', position: { x: 11, y: 0, z: 8 } },
      { id: 'p_h3_flower', assetId: 'prop_crate_001', position: { x: -3, y: 0, z: 11 } },
      { id: 'p_h4_chair', assetId: 'prop_chair_001', position: { x: 1, y: 0, z: 12.5 } },

      // Plaza extra barrel
      { id: 'p_plaza_barrel2', assetId: 'prop_barrel_001', position: { x: 3.5, y: 0, z: -3 } },

      // Plaza corner stalls (4 corners for market feel)
      {
        id: 'p_plaza_stall1_table',
        assetId: 'prop_table_001',
        position: { x: -4, y: 0, z: -4 },
        rotation: { x: 0, y: 0.78, z: 0 },
      },
      {
        id: 'p_plaza_stall1_crate',
        assetId: 'prop_crate_001',
        position: { x: -4.5, y: 0, z: -3.2 },
      },
      {
        id: 'p_plaza_stall2_table',
        assetId: 'prop_table_001',
        position: { x: 4, y: 0, z: 4 },
        rotation: { x: 0, y: 2.36, z: 0 },
      },
      {
        id: 'p_plaza_stall2_barrel',
        assetId: 'prop_barrel_001',
        position: { x: 4.5, y: 0, z: 3.2 },
      },
      {
        id: 'p_plaza_stall3_table',
        assetId: 'prop_table_001',
        position: { x: 4, y: 0, z: -4 },
        rotation: { x: 0, y: -0.78, z: 0 },
      },
      {
        id: 'p_plaza_stall3_crate',
        assetId: 'prop_crate_001',
        position: { x: 3.3, y: 0, z: -4.5 },
      },
      {
        id: 'p_plaza_stall4_table',
        assetId: 'prop_table_001',
        position: { x: -4, y: 0, z: 4 },
        rotation: { x: 0, y: -2.36, z: 0 },
      },
      {
        id: 'p_plaza_stall4_barrel',
        assetId: 'prop_barrel_001',
        position: { x: -3.3, y: 0, z: 4.5 },
      },

      // Plaza extra props
      { id: 'p_plaza_crate_stack', assetId: 'prop_crate_001', position: { x: -2, y: 0, z: -4 } },
      { id: 'p_plaza_crate_top', assetId: 'prop_crate_001', position: { x: -2, y: 0.6, z: -4 } },
      { id: 'p_plaza_bench3', assetId: 'prop_bench_001', position: { x: 2, y: 0, z: 4 } },

      // Townhall entrance props
      { id: 'p_townhall_barrel1', assetId: 'prop_barrel_001', position: { x: -2, y: 0, z: -9 } },
      { id: 'p_townhall_barrel2', assetId: 'prop_barrel_001', position: { x: 2, y: 0, z: -9 } },
    ],
    nature: [
      // Cluster NW (3 trees + bush + rock)
      { id: 'n_nw1', assetId: 'nature_tree_round_001', position: { x: -22, y: 0, z: -22 } },
      { id: 'n_nw2', assetId: 'nature_tree_round_002', position: { x: -20, y: 0, z: -25 } },
      { id: 'n_nw3', assetId: 'nature_tree_pine_001', position: { x: -25, y: 0, z: -20 } },
      { id: 'n_nw_b', assetId: 'nature_bush_001', position: { x: -23, y: 0, z: -24 } },
      { id: 'n_nw_r', assetId: 'nature_rock_small_001', position: { x: -21, y: 0, z: -19 } },

      // Cluster NE (3 trees + bush + rock)
      { id: 'n_ne1', assetId: 'nature_tree_pine_001', position: { x: 22, y: 0, z: -22 } },
      { id: 'n_ne2', assetId: 'nature_tree_pine_002', position: { x: 25, y: 0, z: -20 } },
      { id: 'n_ne3', assetId: 'nature_tree_round_003', position: { x: 20, y: 0, z: -25 } },
      { id: 'n_ne_r', assetId: 'nature_rock_small_001', position: { x: 23, y: 0, z: -23 } },
      { id: 'n_ne_b', assetId: 'nature_bush_002', position: { x: 24, y: 0, z: -21 } },

      // Cluster SW (3 trees + bush + rock)
      { id: 'n_sw1', assetId: 'nature_tree_round_001', position: { x: -22, y: 0, z: 22 } },
      { id: 'n_sw2', assetId: 'nature_tree_pine_001', position: { x: -25, y: 0, z: 25 } },
      { id: 'n_sw3', assetId: 'nature_tree_round_002', position: { x: -20, y: 0, z: 26 } },
      { id: 'n_sw_b', assetId: 'nature_bush_001', position: { x: -23, y: 0, z: 21 } },
      { id: 'n_sw_r', assetId: 'nature_rock_small_002', position: { x: -21, y: 0, z: 25 } },

      // Cluster SE (3 trees + bush + rock)
      { id: 'n_se1', assetId: 'nature_tree_pine_002', position: { x: 22, y: 0, z: 22 } },
      { id: 'n_se2', assetId: 'nature_tree_round_001', position: { x: 25, y: 0, z: 25 } },
      { id: 'n_se3', assetId: 'nature_tree_round_003', position: { x: 26, y: 0, z: 20 } },
      { id: 'n_se_r', assetId: 'nature_rock_small_003', position: { x: 23, y: 0, z: 23 } },
      { id: 'n_se_b', assetId: 'nature_bush_002', position: { x: 21, y: 0, z: 24 } },

      // Roadside and mid-field decoration
      { id: 'n_mid_bush1', assetId: 'nature_bush_001', position: { x: -8, y: 0, z: -6 } },
      { id: 'n_mid_bush2', assetId: 'nature_bush_002', position: { x: 8, y: 0, z: -6 } },
      { id: 'n_mid_rock1', assetId: 'nature_rock_small_001', position: { x: -6, y: 0, z: 6 } },
      { id: 'n_mid_rock2', assetId: 'nature_rock_small_002', position: { x: 7, y: 0, z: 5 } },
      { id: 'n_path_rock1', assetId: 'nature_rock_small_003', position: { x: -7, y: 0, z: -2.5 } },
      { id: 'n_path_bush1', assetId: 'nature_bush_002', position: { x: 7, y: 0, z: -2.5 } },
      { id: 'n_path_rock2', assetId: 'nature_rock_small_001', position: { x: -7, y: 0, z: 9 } },
      { id: 'n_path_bush2', assetId: 'nature_bush_001', position: { x: -1, y: 0, z: 7 } },
    ],
    resourceNodes: [],
    npcSpawns: [
      {
        id: 'spawn_player',
        assetId: 'npc_player_001',
        position: { x: 0, y: 0, z: 3 },
        name: '玩家',
        displayName: '玩家',
        role: 'player',
      },
      {
        id: 'spawn_npc_ammu',
        assetId: 'npc_base_001',
        position: { x: -2.5, y: 0, z: -1.5 },
        name: '阿木',
        displayName: '阿木',
        role: 'resident',
      },
      {
        id: 'spawn_npc_laozhou',
        assetId: 'npc_base_003',
        position: { x: -3.5, y: 0, z: 2 },
        name: '老周',
        displayName: '老周',
        role: 'resident',
      },
      {
        id: 'spawn_npc_xiaohe',
        assetId: 'npc_base_002',
        position: { x: 2.5, y: 0, z: 2 },
        name: '小禾',
        displayName: '小禾',
        role: 'resident',
      },
      {
        id: 'spawn_npc_aqing',
        assetId: 'npc_base_001',
        position: { x: 3.5, y: 0, z: -1.5 },
        name: '阿青',
        displayName: '阿青',
        role: 'resident',
      },
    ],
  };

  // 1. Central Plaza (Solid 10x10 stone_path)
  for (let x = -5; x <= 5; x++) {
    for (let z = -5; z <= 5; z++) {
      mapData.roads.push({
        id: `p_tile_${x}_${z}`,
        kind: 'plaza_stone',
        position: { x, y: 0, z },
        width: 1.1,
        depth: 1.1,
      });
    }
  }

  // 2. Continuous Town Paths (dirt_path)
  // Connect buildings
  const paths = [
    { start: { x: 0, z: -5 }, end: { x: 0, z: -10 }, kind: 'dirt_path' }, // Townhall road
    { start: { x: -5, z: -2 }, end: { x: -10, z: -2 }, kind: 'dirt_path' }, // Shop road
    { start: { x: 5, z: -2 }, end: { x: 10, z: -2 }, kind: 'dirt_path' }, // Workshop road
    { start: { x: -5, z: 9 }, end: { x: -10, z: 9 }, kind: 'dirt_path' }, // Warehouse road
    { start: { x: 0, z: 5 }, end: { x: 0, z: 12 }, kind: 'dirt_path' }, // South road
    { start: { x: 0, z: 10 }, end: { x: 12, z: 10 }, kind: 'dirt_path' }, // East residential street
  ];

  for (const p of paths) {
    const isX = p.start.x !== p.end.x;
    const dist = isX ? Math.abs(p.end.x - p.start.x) : Math.abs(p.end.z - p.start.z);
    const step = 0.5;
    for (let i = 0; i <= dist; i += step) {
      const x = isX ? p.start.x + (p.end.x > p.start.x ? i : -i) : p.start.x;
      const z = !isX ? p.start.z + (p.end.z > p.start.z ? i : -i) : p.start.z;
      mapData.roads.push({
        id: `path_${x.toFixed(1)}_${z.toFixed(1)}`,
        kind: p.kind,
        position: { x, y: 0, z },
        width: 1.8,
        depth: 1.8,
      });
    }
  }

  const mapPath = path.resolve('maps/qtown_v0_1.json');
  await fs.writeFile(mapPath, JSON.stringify(mapData, null, 2));
  console.log('✅ maps/qtown_v0_1.json updated with procedural Town Paths.');
}

main().catch(console.error);
