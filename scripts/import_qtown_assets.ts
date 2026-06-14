import fs from 'fs/promises';
import path from 'path';
import { glob } from 'glob';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

interface AssetMapping {
  id: string;
  type: string;
  keywords: string[];
  count: number;
  destDir: string;
  tags: string[];
  roofHideable?: boolean;
}

// Stricter mapping rules to avoid assigning wrong props.
const mappings: AssetMapping[] = [
  {
    id: 'building_house_wood',
    type: 'building',
    keywords: ['building_A', 'building_B', 'building_C', 'building_D'],
    count: 4,
    destDir: 'buildings',
    tags: ['house', 'residential', 'q-style'],
    roofHideable: true,
  },
  {
    id: 'building_shop',
    type: 'building',
    keywords: ['building_E'],
    count: 1,
    destDir: 'buildings',
    tags: ['shop', 'commercial', 'q-style'],
  },
  {
    id: 'building_workshop',
    type: 'building',
    keywords: ['building_F'],
    count: 1,
    destDir: 'buildings',
    tags: ['workshop', 'production'],
  },
  {
    id: 'building_warehouse',
    type: 'building',
    keywords: ['building_G'],
    count: 1,
    destDir: 'buildings',
    tags: ['warehouse', 'storage'],
  },
  {
    id: 'building_townhall',
    type: 'building',
    keywords: ['building_H'],
    count: 1,
    destDir: 'buildings',
    tags: ['townhall', 'public'],
  },

  {
    id: 'road_straight',
    type: 'road',
    keywords: ['road_straight_crossing'],
    count: 1,
    destDir: 'roads',
    tags: ['road', 'straight'],
  },
  {
    id: 'road_corner',
    type: 'road',
    keywords: ['road_corner_curved'],
    count: 1,
    destDir: 'roads',
    tags: ['road', 'corner'],
  },
  {
    id: 'road_cross',
    type: 'road',
    keywords: ['road_intersection'],
    count: 1,
    destDir: 'roads',
    tags: ['road', 'cross'],
  },
  {
    id: 'road_t',
    type: 'road',
    keywords: ['road_tsplit'],
    count: 1,
    destDir: 'roads',
    tags: ['road', 't-junction'],
  },
  {
    id: 'road_plaza_tile',
    type: 'road',
    keywords: ['tileSmall_teamYellow'],
    count: 1,
    destDir: 'roads',
    tags: ['road', 'plaza'],
  },

  {
    id: 'nature_tree_round',
    type: 'nature',
    keywords: ['TwistedTree'],
    count: 3,
    destDir: 'nature',
    tags: ['nature', 'tree', 'round'],
  },
  {
    id: 'nature_tree_pine',
    type: 'nature',
    keywords: ['Pine_'],
    count: 2,
    destDir: 'nature',
    tags: ['nature', 'tree', 'pine'],
  },
  {
    id: 'nature_bush',
    type: 'nature',
    keywords: ['Bush_Common'],
    count: 3,
    destDir: 'nature',
    tags: ['nature', 'bush'],
  },
  {
    id: 'nature_rock_small',
    type: 'nature',
    keywords: ['RockPath_Square_Small'],
    count: 3,
    destDir: 'nature',
    tags: ['nature', 'rock'],
  },

  {
    id: 'npc_player',
    type: 'character',
    keywords: ['character_dog'],
    count: 1,
    destDir: 'characters',
    tags: ['character', 'player'],
  },
  {
    id: 'npc_base',
    type: 'character',
    keywords: ['character_bear', 'character_duck'],
    count: 3,
    destDir: 'characters',
    tags: ['character', 'npc'],
  },

  {
    id: 'prop_table',
    type: 'prop',
    keywords: ['Table_Spoon', 'Table_Round'],
    count: 1,
    destDir: 'props',
    tags: ['prop', 'furniture'],
  },
  {
    id: 'prop_chair',
    type: 'prop',
    keywords: ['Stool'],
    count: 1,
    destDir: 'props',
    tags: ['prop', 'furniture'],
  },
  {
    id: 'prop_barrel',
    type: 'prop',
    keywords: ['Barrel_Holder', 'Barrel_Big'],
    count: 1,
    destDir: 'props',
    tags: ['prop', 'container'],
  },
  {
    id: 'prop_crate',
    type: 'prop',
    keywords: ['FarmCrate'],
    count: 1,
    destDir: 'props',
    tags: ['prop', 'container'],
  },
  {
    id: 'prop_bed',
    type: 'prop',
    keywords: ['Bed_Twin'],
    count: 1,
    destDir: 'props',
    tags: ['prop', 'furniture'],
  },
  {
    id: 'prop_wood_stack',
    type: 'prop',
    keywords: ['wood-floor', 'WoodLog'],
    count: 1,
    destDir: 'props',
    tags: ['prop', 'resource'],
  },
  {
    id: 'prop_bench',
    type: 'prop',
    keywords: ['bench', 'Bench'],
    count: 1,
    destDir: 'props',
    tags: ['prop', 'furniture', 'exterior'],
  },
  {
    id: 'prop_stall',
    type: 'prop',
    keywords: ['Stall_Empty', 'Stall_Cart'],
    count: 2,
    destDir: 'props',
    tags: ['prop', 'market', 'exterior'],
  },
  {
    id: 'prop_fence',
    type: 'prop',
    keywords: ['fence-wood', 'fence'],
    count: 1,
    destDir: 'props',
    tags: ['prop', 'structure', 'exterior'],
  },
];

async function convertToGLB(inputPath: string, outputPath: string): Promise<boolean> {
  const ext = path.extname(inputPath).toLowerCase();
  if (ext === '.glb') {
    await fs.copyFile(inputPath, outputPath);
    return true;
  } else if (ext === '.gltf') {
    try {
      console.log(`  Packing ${inputPath} -> ${outputPath}`);
      await execAsync(`npx gltf-transform copy "${inputPath}" "${outputPath}"`);
      return true;
    } catch (error) {
      console.error(`  [ERROR] Failed to convert ${inputPath}:`, error);
      return false;
    }
  } else {
    console.warn(`  [WARN] Format ${ext} not natively convertible yet without Blender. Skipping.`);
    return false;
  }
}

async function main() {
  console.log('Starting Q-Town Asset Import (Strict Pipeline)...');

  const sourceDir = path.resolve('assets/source');
  // Only looking for explicit gltf and glb files.
  const allModels = await glob('**/*.{glb,gltf}', { cwd: sourceDir, nocase: true });
  console.log(`Found ${allModels.length} models in source directory.`);

  const manifest: any = { version: '0.1', mapId: 'qtown_v0_1', assets: [] };
  const licenseManifest: any = { version: '0.1', assets: [] };

  const dirs = ['buildings', 'characters', 'props', 'nature', 'roads', 'interiors', 'resources'];
  for (const dir of dirs) {
    await fs.mkdir(path.resolve(`assets/glb/${dir}`), { recursive: true });
  }

  const usedModels = new Set<string>();
  let successCount = 0;
  let failCount = 0;

  for (const mapping of mappings) {
    let matched = 0;

    const potentialMatches = allModels.filter((m) => {
      if (usedModels.has(m)) return false;
      const filename = path.basename(m).toLowerCase();
      return mapping.keywords.some((k) => filename.includes(k.toLowerCase()));
    });

    // Exact matches preferred over loose ones
    potentialMatches.sort((a, b) => {
      const aName = path.basename(a).toLowerCase();
      const bName = path.basename(b).toLowerCase();
      const aExact = mapping.keywords.some(
        (k) => aName === `${k.toLowerCase()}.gltf` || aName === `${k.toLowerCase()}.glb`
      )
        ? 1
        : 0;
      const bExact = mapping.keywords.some(
        (k) => bName === `${k.toLowerCase()}.gltf` || bName === `${k.toLowerCase()}.glb`
      )
        ? 1
        : 0;
      return bExact - aExact;
    });

    for (let i = 0; i < potentialMatches.length && matched < mapping.count; i++) {
      const srcModel = potentialMatches[i];

      const assetId =
        mapping.count === 1
          ? `${mapping.id}_001`
          : `${mapping.id}_${String(matched + 1).padStart(3, '0')}`;
      const destPathRel = `/assets/glb/${mapping.destDir}/${assetId}.glb`;
      const destPath = path.resolve(`.${destPathRel}`);

      const success = await convertToGLB(path.resolve(sourceDir, srcModel), destPath);
      if (success) {
        usedModels.add(srcModel);

        let sourceName = 'Unknown';
        let license = 'Unknown - do not use in production';
        let commercialUse = false;

        if (srcModel.includes('kaykit')) {
          sourceName = 'KayKit';
          license = 'CC0';
          commercialUse = true;
        } else if (srcModel.includes('kenney')) {
          sourceName = 'Kenney';
          license = 'CC0';
          commercialUse = true;
        } else if (srcModel.includes('quaternius')) {
          sourceName = 'Quaternius';
          license = 'CC0';
          commercialUse = true;
        }

        manifest.assets.push({
          id: assetId,
          type: mapping.type,
          path: destPathRel,
          tags: mapping.tags,
          size: { width: 2, height: 2, depth: 2 },
          collision: { type: 'box', width: 2, height: 2, depth: 2 },
          roof: mapping.roofHideable ? { hideable: true, roofNodeName: 'Roof' } : undefined,
          source: sourceName,
        });

        licenseManifest.assets.push({
          assetId: assetId,
          source: sourceName,
          license: license,
          commercialUse: commercialUse,
          devOnly: !commercialUse,
          originalFile: `assets/source/${srcModel}`,
          convertedFile: destPathRel,
        });

        matched++;
        successCount++;
        console.log(`✅ ${srcModel} -> ${assetId}.glb`);
      } else {
        failCount++;
      }
    }

    if (matched < mapping.count) {
      console.warn(
        `⚠️  Missing required assets for ${mapping.id} (found ${matched}/${mapping.count})`
      );
    }
  }

  if (manifest.assets.length === 0) {
    console.error('❌ CRITICAL: No assets were successfully imported. asset-manifest is empty.');
    process.exit(1);
  }

  await fs.writeFile(
    path.resolve('assets/manifest/asset-manifest.json'),
    JSON.stringify(manifest, null, 2)
  );
  await fs.writeFile(
    path.resolve('assets/manifest/license-manifest.json'),
    JSON.stringify(licenseManifest, null, 2)
  );

  console.log(`\nImport Summary:`);
  console.log(`  Successfully processed: ${successCount}`);
  console.log(`  Failed conversions: ${failCount}`);
  console.log('Manifests have been accurately updated with real paths.');
}

main().catch(console.error);
