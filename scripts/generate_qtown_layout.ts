import fs from 'fs/promises';
import path from 'path';

async function main() {
  console.log('Generating compact Q-Town v0.1 layout...');

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
      { id: "p_barrel_shop", assetId: "prop_barrel_001", position: { x: -10, y: 0, z: -4 } },
      { id: "p_crate_shop", assetId: "prop_crate_001", position: { x: -10, y: 0, z: -5 } },
      { id: "p_table_shop", assetId: "prop_table_001", position: { x: -12, y: 0, z: -5 } },
      { id: "p_chair_shop", assetId: "prop_chair_001", position: { x: -13, y: 0, z: -5 } },
      { id: "p_crate_wh", assetId: "prop_crate_001", position: { x: -10, y: 0, z: 10 } },
      { id: "p_barrel_wh", assetId: "prop_barrel_001", position: { x: -10, y: 0, z: 11 } }
    ],
    nature: [
      { id: "n_t1", assetId: "nature_tree_round_001", position: { x: -20, y: 0, z: -20 } },
      { id: "n_t2", assetId: "nature_tree_round_002", position: { x: 20, y: 0, z: -20 } },
      { id: "n_t3", assetId: "nature_tree_round_003", position: { x: -20, y: 0, z: 20 } },
      { id: "n_t4", assetId: "nature_tree_pine_001", position: { x: 20, y: 0, z: 20 } },
      { id: "n_t5", assetId: "nature_tree_pine_002", position: { x: 0, y: 0, z: -25 } },
      { id: "n_t6", assetId: "nature_tree_round_001", position: { x: -22, y: 0, z: -18 } },
      { id: "n_t7", assetId: "nature_tree_round_002", position: { x: 22, y: 0, z: -18 } },
      { id: "n_t8", assetId: "nature_tree_round_003", position: { x: -22, y: 0, z: 22 } },
      { id: "n_t9", assetId: "nature_tree_pine_001", position: { x: 22, y: 0, z: 22 } },
      { id: "n_r1", assetId: "nature_rock_small_001", position: { x: -18, y: 0, z: -15 } },
      { id: "n_b1", assetId: "nature_bush_001", position: { x: 18, y: 0, z: -15 } },
      { id: "n_b2", assetId: "nature_bush_002", position: { x: 0, y: 0, z: 25 } }
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

  // 2. Main Roads
  // North-South
  for (let z = -14; z <= 14; z += 2) {
    if (Math.abs(z) > 4) {
      mapData.roads.push({
        id: `road_ns_${z}`,
        assetId: "road_straight_001",
        position: { x: 0, y: 0, z },
        rotation: { x: 0, y: 0, z: 0 }
      });
    }
  }
  // East-West
  for (let x = -14; x <= 14; x += 2) {
    if (Math.abs(x) > 4) {
      mapData.roads.push({
        id: `road_ew_${x}`,
        assetId: "road_straight_001",
        position: { x, y: 0, z: 0 },
        rotation: { x: 0, y: 1.57, z: 0 }
      });
    }
  }

  const mapPath = path.resolve('maps/qtown_v0_1.json');
  await fs.writeFile(mapPath, JSON.stringify(mapData, null, 2));
  console.log('✅ maps/qtown_v0_1.json re-generated with town structure.');
}

main().catch(console.error);
