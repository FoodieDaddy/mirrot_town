import fs from 'fs/promises';
import path from 'path';

async function main() {
  console.log('Generating lived-in Q-Town v0.1 layout...');

  const mapData = {
    id: "qtown_v0_1",
    name: "Q Town v0.1",
    style: "q-low-poly-cartoon",
    camera: {
      type: "orthographic",
      angle: { x: 60, y: 0, z: 45 },
      zoom: 1
    },
    size: { width: 64, depth: 64 },
    spawn: { player: { x: 0, y: 0, z: 0 } },
    buildings: [
      { 
        id: "b_townhall", 
        assetId: "building_townhall_001", 
        position: { x: 0, y: 0, z: -12 }, 
        rotation: { x: 0, y: 0, z: 0 },
        buildingType: "townhall",
        displayName: "小镇大厅",
        entrance: { x: 0, y: 0, z: -10 },
        indoorArea: { enabled: false, width: 6, depth: 6 },
        roof: { hideable: true, mode: "normal" }
      },
      { 
        id: "b_shop", 
        assetId: "building_shop_001", 
        position: { x: -12, y: 0, z: -2 }, 
        rotation: { x: 0, y: 1.57, z: 0 },
        buildingType: "shop",
        displayName: "杂货铺",
        entrance: { x: -10, y: 0, z: -2 },
        indoorArea: { enabled: false, width: 4, depth: 4 },
        roof: { hideable: true, mode: "normal" }
      },
      { 
        id: "b_workshop", 
        assetId: "building_workshop_001", 
        position: { x: 12, y: 0, z: -2 }, 
        rotation: { x: 0, y: -1.57, z: 0 },
        buildingType: "workshop",
        displayName: "铁匠工房",
        entrance: { x: 10, y: 0, z: -2 },
        indoorArea: { enabled: false, width: 4, depth: 4 },
        roof: { hideable: true, mode: "normal" }
      },
      { 
        id: "b_warehouse", 
        assetId: "building_warehouse_001", 
        position: { x: -12, y: 0, z: 9 }, 
        rotation: { x: 0, y: 1.57, z: 0 },
        buildingType: "warehouse",
        displayName: "镇中心仓库",
        entrance: { x: -10, y: 0, z: 9 },
        indoorArea: { enabled: false, width: 5, depth: 5 },
        roof: { hideable: true, mode: "normal" }
      },
      { 
        id: "b_house1", 
        assetId: "building_house_wood_001", 
        position: { x: 6, y: 0, z: 10 }, 
        rotation: { x: 0, y: 0, z: 0 },
        buildingType: "house",
        displayName: "老周家",
        entrance: { x: 6, y: 0, z: 8 },
        indoorArea: { enabled: false, width: 3, depth: 3 },
        roof: { hideable: true, mode: "normal" }
      },
      { 
        id: "b_house2", 
        assetId: "building_house_wood_002", 
        position: { x: 12, y: 0, z: 10 }, 
        rotation: { x: 0, y: 0, z: 0 },
        buildingType: "house",
        displayName: "小禾家",
        entrance: { x: 12, y: 0, z: 8 },
        indoorArea: { enabled: false, width: 3, depth: 3 },
        roof: { hideable: true, mode: "normal" }
      },
      { 
        id: "b_house3", 
        assetId: "building_house_wood_003", 
        position: { x: -4, y: 0, z: 13 }, 
        rotation: { x: 0, y: 3.14, z: 0 },
        buildingType: "house",
        displayName: "阿木家",
        entrance: { x: -4, y: 0, z: 11 },
        indoorArea: { enabled: false, width: 3, depth: 3 },
        roof: { hideable: true, mode: "normal" }
      },
      { 
        id: "b_house4", 
        assetId: "building_house_wood_004", 
        position: { x: 2, y: 0, z: 14 }, 
        rotation: { x: 0, y: 3.14, z: 0 },
        buildingType: "house",
        displayName: "阿青家",
        entrance: { x: 2, y: 0, z: 12 },
        indoorArea: { enabled: false, width: 3, depth: 3 },
        roof: { hideable: true, mode: "normal" }
      }
    ],
    roads: [] as any[],
    props: [
      // Plaza Decorations
      { id: "p_plaza_stall1", assetId: "prop_stall_001", position: { x: -3, y: 0, z: -3 }, rotation: { x: 0, y: 0.5, z: 0 } },
      { id: "p_plaza_stall2", assetId: "prop_stall_002", position: { x: 3, y: 0, z: -3 }, rotation: { x: 0, y: -0.5, z: 0 } },
      { id: "p_plaza_bench1", assetId: "prop_bench_001", position: { x: 0, y: 0, z: 4 }, rotation: { x: 0, y: 3.14, z: 0 } },
      
      // Shop Props
      { id: "p_barrel_shop", assetId: "prop_barrel_001", position: { x: -10, y: 0, z: -4 } },
      { id: "p_crate_shop", assetId: "prop_crate_001", position: { x: -10, y: 0, z: -5 } },
      { id: "p_table_shop", assetId: "prop_table_001", position: { x: -12, y: 0, z: -5 } },
      { id: "p_chair_shop", assetId: "prop_chair_001", position: { x: -13, y: 0, z: -5 } },
      
      // Workshop Props
      { id: "p_crate_ws1", assetId: "prop_crate_001", position: { x: 10, y: 0, z: -4 } },
      { id: "p_barrel_ws1", assetId: "prop_barrel_001", position: { x: 10, y: 0, z: -5 } },
      
      // Warehouse Props
      { id: "p_crate_wh1", assetId: "prop_crate_001", position: { x: -10, y: 0, z: 10 } },
      { id: "p_barrel_wh1", assetId: "prop_barrel_001", position: { x: -10, y: 0, z: 11 } },
      
      // Residential Props
      { id: "p_bench_h1", assetId: "prop_bench_001", position: { x: 8, y: 0, z: 12 }, rotation: { x: 0, y: 1.57, z: 0 } },
      { id: "p_table_h1", assetId: "prop_table_001", position: { x: 8, y: 0, z: 14 } }
    ],
    nature: [
      // Cluster NW
      { id: "n_t_nw1", assetId: "nature_tree_round_001", position: { x: -20, y: 0, z: -20 } },
      { id: "n_t_nw2", assetId: "nature_tree_pine_001", position: { x: -22, y: 0, z: -18 } },
      { id: "n_r_nw1", assetId: "nature_rock_small_001", position: { x: -18, y: 0, z: -22 } },
      
      // Cluster NE
      { id: "n_t_ne1", assetId: "nature_tree_round_002", position: { x: 20, y: 0, z: -20 } },
      { id: "n_t_ne2", assetId: "nature_tree_pine_002", position: { x: 22, y: 0, z: -18 } },
      { id: "n_b_ne1", assetId: "nature_bush_001", position: { x: 18, y: 0, z: -22 } },
      
      // Cluster SW
      { id: "n_t_sw1", assetId: "nature_tree_round_003", position: { x: -20, y: 0, z: 20 } },
      { id: "n_b_sw1", assetId: "nature_bush_002", position: { x: -22, y: 0, z: 22 } },
      
      // Cluster SE
      { id: "n_t_se1", assetId: "nature_tree_pine_001", position: { x: 20, y: 0, z: 20 } },
      { id: "n_t_se2", assetId: "nature_tree_round_001", position: { x: 22, y: 0, z: 22 } },
      
      // Random Fillers
      { id: "n_t_back", assetId: "nature_tree_pine_002", position: { x: 0, y: 0, z: -25 } },
      { id: "n_b_front", assetId: "nature_bush_001", position: { x: 0, y: 0, z: 25 } }
    ],
    resourceNodes: [],
    npcSpawns: [
      { id: "spawn_player", assetId: "npc_player_001", position: { x: 0, y: 0, z: 0 }, name: "玩家" },
      { id: "spawn_npc_ammu", assetId: "npc_base_001", position: { x: -2, y: 0, z: -2 }, name: "阿木" },
      { id: "spawn_npc_xiaohe", assetId: "npc_base_002", position: { x: 2, y: 0, z: 2 }, name: "小禾" },
      { id: "spawn_npc_laozhou", assetId: "npc_base_003", position: { x: -3, y: 0, z: 3 }, name: "老周" },
      { id: "spawn_npc_aqing", assetId: "npc_base_001", position: { x: 3, y: 0, z: -3 }, name: "阿青" }
    ]
  };

  // 1. Fill Central Plaza (10x10 area, 2m steps)
  for (let x = -4; x <= 4; x += 2) {
    for (let z = -4; z <= 4; z += 2) {
      mapData.roads.push({
        id: `road_plaza_${x}_${z}`,
        assetId: "road_plaza_tile_001",
        position: { x, y: 0, z }
      });
    }
  }

  // 2. Main Roads (Continuous)
  // North Main
  for (let z = -14; z < -4; z += 2) {
    mapData.roads.push({ id: `road_n_${z}`, assetId: "road_straight_001", position: { x: 0, y: 0, z } });
  }
  // South Main
  for (let z = 6; z <= 14; z += 2) {
    mapData.roads.push({ id: `road_s_${z}`, assetId: "road_straight_001", position: { x: 0, y: 0, z } });
  }
  // West Main
  for (let x = -14; x < -4; x += 2) {
    mapData.roads.push({ id: `road_w_${x}`, assetId: "road_straight_001", position: { x, y: 0, z: 0 }, rotation: { x: 0, y: 1.57, z: 0 } });
  }
  // East Main
  for (let x = 6; x <= 14; x += 2) {
    mapData.roads.push({ id: `road_e_${x}`, assetId: "road_straight_001", position: { x, y: 0, z: 0 }, rotation: { x: 0, y: 1.57, z: 0 } });
  }
  
  // Connection to buildings
  mapData.roads.push({ id: "road_to_shop", assetId: "road_straight_001", position: { x: -6, y: 0, z: -2 }, rotation: { x: 0, y: 1.57, z: 0 } });
  mapData.roads.push({ id: "road_to_shop2", assetId: "road_straight_001", position: { x: -8, y: 0, z: -2 }, rotation: { x: 0, y: 1.57, z: 0 } });
  mapData.roads.push({ id: "road_to_workshop", assetId: "road_straight_001", position: { x: 6, y: 0, z: -2 }, rotation: { x: 0, y: 1.57, z: 0 } });
  mapData.roads.push({ id: "road_to_workshop2", assetId: "road_straight_001", position: { x: 8, y: 0, z: -2 }, rotation: { x: 0, y: 1.57, z: 0 } });
  mapData.roads.push({ id: "road_to_warehouse", assetId: "road_straight_001", position: { x: -6, y: 0, z: 9 }, rotation: { x: 0, y: 1.57, z: 0 } });
  mapData.roads.push({ id: "road_to_warehouse2", assetId: "road_straight_001", position: { x: -8, y: 0, z: 9 }, rotation: { x: 0, y: 1.57, z: 0 } });

  const mapPath = path.resolve('maps/qtown_v0_1.json');
  await fs.writeFile(mapPath, JSON.stringify(mapData, null, 2));
  console.log('✅ maps/qtown_v0_1.json re-generated with dense town structure.');
}

main().catch(console.error);
