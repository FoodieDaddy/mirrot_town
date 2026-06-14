import fs from 'fs/promises';
import path from 'path';
import { glob } from 'glob';

interface AssetMapping {
    id: string;
    type: string;
    keywords: string[];
    count: number;
    destDir: string;
    tags: string[];
    roofHideable?: boolean;
    sourceFallback?: string;
}

const mappings: AssetMapping[] = [
    { id: 'building_house_wood', type: 'building', keywords: ['building_A', 'building_B', 'building_C', 'building_D'], count: 4, destDir: 'buildings', tags: ['house', 'residential', 'q-style'], roofHideable: true },
    { id: 'building_shop', type: 'building', keywords: ['building_E'], count: 1, destDir: 'buildings', tags: ['shop', 'commercial', 'q-style'] },
    { id: 'building_workshop', type: 'building', keywords: ['building_F'], count: 1, destDir: 'buildings', tags: ['workshop', 'production'] },
    { id: 'building_warehouse', type: 'building', keywords: ['building_G'], count: 1, destDir: 'buildings', tags: ['warehouse', 'storage'] },
    { id: 'building_townhall', type: 'building', keywords: ['building_H'], count: 1, destDir: 'buildings', tags: ['townhall', 'public'] },
    { id: 'building_construction_site', type: 'building', keywords: ['structure-wood', 'construction'], count: 1, destDir: 'buildings', tags: ['construction'] },


    { id: 'road_straight', type: 'road', keywords: ['road_straight', 'roadStraight', 'road'], count: 1, destDir: 'roads', tags: ['road', 'straight'] },
    { id: 'road_corner', type: 'road', keywords: ['road_corner', 'roadCorner', 'corner'], count: 1, destDir: 'roads', tags: ['road', 'corner'] },
    { id: 'road_cross', type: 'road', keywords: ['road_cross', 'roadCross', 'cross'], count: 1, destDir: 'roads', tags: ['road', 'cross'] },
    { id: 'road_t', type: 'road', keywords: ['road_t', 'roadT', 'split'], count: 1, destDir: 'roads', tags: ['road', 't-junction'] },
    { id: 'road_plaza_tile', type: 'road', keywords: ['tile', 'plaza', 'paving'], count: 1, destDir: 'roads', tags: ['road', 'plaza'] },

    { id: 'nature_tree_round', type: 'nature', keywords: ['tree', 'round'], count: 3, destDir: 'nature', tags: ['nature', 'tree', 'round'] },
    { id: 'nature_tree_pine', type: 'nature', keywords: ['pine', 'fir'], count: 2, destDir: 'nature', tags: ['nature', 'tree', 'pine'] },
    { id: 'nature_bush', type: 'nature', keywords: ['bush', 'shrub'], count: 3, destDir: 'nature', tags: ['nature', 'bush'] },
    { id: 'nature_rock_small', type: 'nature', keywords: ['rock', 'stone', 'small'], count: 3, destDir: 'nature', tags: ['nature', 'rock'] },

    { id: 'npc_player', type: 'character', keywords: ['character', 'player', 'hero'], count: 1, destDir: 'characters', tags: ['character', 'player'] },
    { id: 'npc_base', type: 'character', keywords: ['character', 'npc', 'villager', 'man', 'woman'], count: 3, destDir: 'characters', tags: ['character', 'npc'] },

    { id: 'prop_table', type: 'prop', keywords: ['table', 'desk'], count: 1, destDir: 'props', tags: ['prop', 'furniture'] },
    { id: 'prop_chair', type: 'prop', keywords: ['chair', 'stool', 'seat'], count: 1, destDir: 'props', tags: ['prop', 'furniture'] },
    { id: 'prop_barrel', type: 'prop', keywords: ['barrel'], count: 1, destDir: 'props', tags: ['prop', 'container'] },
    { id: 'prop_crate', type: 'prop', keywords: ['crate', 'box'], count: 1, destDir: 'props', tags: ['prop', 'container'] },
    { id: 'prop_bed', type: 'prop', keywords: ['bed', 'bunk'], count: 1, destDir: 'props', tags: ['prop', 'furniture'] },
    { id: 'prop_wood_stack', type: 'prop', keywords: ['wood', 'log', 'stack'], count: 1, destDir: 'props', tags: ['prop', 'resource'] }
];

async function main() {
    console.log('Starting Q-Town Asset Import...');
    
    // Find all potential models
    const sourceDir = path.resolve('assets/source');
    const allModels = await glob('**/*.{glb,gltf}', { cwd: sourceDir, nocase: true });
    
    console.log(`Found ${allModels.length} models in source directory.`);

    const manifest: any = { version: "0.1", mapId: "qtown_v0_1", assets: [] };
    const licenseManifest: any = { version: "0.1", assets: [] };
    
    // Ensure destination directories exist
    const dirs = ['buildings', 'characters', 'props', 'nature', 'roads', 'interiors', 'resources'];
    for (const dir of dirs) {
        await fs.mkdir(path.resolve(`assets/glb/${dir}`), { recursive: true });
    }

    const usedModels = new Set<string>();

    for (const mapping of mappings) {
        let matched = 0;
        
        // Find best matches for the keywords
        const potentialMatches = allModels.filter(m => {
            if (usedModels.has(m)) return false;
            const filename = path.basename(m).toLowerCase();
            // Need at least one keyword match to be considered
            return mapping.keywords.some(k => filename.includes(k.toLowerCase()));
        });

        // Sort by number of keyword matches
        potentialMatches.sort((a, b) => {
            const aMatches = mapping.keywords.filter(k => path.basename(a).toLowerCase().includes(k.toLowerCase())).length;
            const bMatches = mapping.keywords.filter(k => path.basename(b).toLowerCase().includes(k.toLowerCase())).length;
            return bMatches - aMatches;
        });

        for (let i = 0; i < potentialMatches.length && matched < mapping.count; i++) {
            const srcModel = potentialMatches[i];
            usedModels.add(srcModel);
            
            const assetId = mapping.count === 1 ? `${mapping.id}_001` : `${mapping.id}_${String(matched + 1).padStart(3, '0')}`;
            const ext = '.glb'; // For gltf, we might just copy it and hope ThreeJS GLTFLoader handles it or it's actually embedded. We'll rename to .glb for consistency as requested.
            const destPathRel = `/assets/glb/${mapping.destDir}/${assetId}${ext}`;
            const destPath = path.resolve(`.${destPathRel}`);
            
            await fs.copyFile(path.resolve(sourceDir, srcModel), destPath);
            
            // Determine Source based on path
            let sourceName = 'Unknown';
            let sourceUrl = '';
            let license = 'Unknown - do not use in production';
            let commercialUse = false;
            
            if (srcModel.includes('kaykit')) {
                sourceName = 'KayKit';
                sourceUrl = 'https://kaylousberg.itch.io/';
                license = 'CC0';
                commercialUse = true;
            } else if (srcModel.includes('kenney')) {
                sourceName = 'Kenney';
                sourceUrl = 'https://kenney.nl/';
                license = 'CC0';
                commercialUse = true;
            } else if (srcModel.includes('quaternius')) {
                sourceName = 'Quaternius';
                sourceUrl = 'https://quaternius.com/';
                license = 'CC0';
                commercialUse = true;
            }

            manifest.assets.push({
                id: assetId,
                type: mapping.type,
                path: destPathRel,
                tags: mapping.tags,
                size: { width: 2, height: 2, depth: 2 },
                collision: { type: "box", width: 2, height: 2, depth: 2 },
                roof: mapping.roofHideable ? { hideable: true, roofNodeName: "Roof" } : undefined,
                source: sourceName
            });

            licenseManifest.assets.push({
                assetId: assetId,
                source: sourceName,
                sourceUrl: sourceUrl,
                license: license,
                commercialUse: commercialUse,
                creditRequired: false,
                devOnly: !commercialUse,
                originalFile: `assets/source/${srcModel}`,
                convertedFile: destPathRel,
                notes: `Auto-imported for qtown_v0_1`
            });
            
            matched++;
            console.log(`Imported ${srcModel} as ${assetId}`);
        }
        
        if (matched < mapping.count) {
            console.warn(`WARNING: Could not find enough assets for ${mapping.id} (found ${matched}/${mapping.count})`);
        }
    }

    await fs.writeFile(path.resolve('assets/manifest/asset-manifest.json'), JSON.stringify(manifest, null, 2));
    await fs.writeFile(path.resolve('assets/manifest/license-manifest.json'), JSON.stringify(licenseManifest, null, 2));
    
    console.log('Import complete. Manifests updated.');
}

main().catch(console.error);
