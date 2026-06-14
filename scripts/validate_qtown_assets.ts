import fs from 'fs/promises';
import path from 'path';

async function checkGlbMagic(filePath: string): Promise<boolean> {
    try {
        const handle = await fs.open(filePath, 'r');
        const buffer = Buffer.alloc(4);
        await handle.read(buffer, 0, 4, 0);
        await handle.close();
        // 0x46546C67 is 'glTF' in ASCII
        return buffer.readUInt32LE(0) === 0x46546C67 || buffer.toString('ascii') === 'glTF';
    } catch (e) {
        return false;
    }
}

async function main() {
    console.log('Validating Q-Town Assets...');
    let hasErrors = false;

    const assetManifestPath = path.resolve('assets/manifest/asset-manifest.json');
    const licenseManifestPath = path.resolve('assets/manifest/license-manifest.json');
    const mapDataPath = path.resolve('maps/qtown_v0_1.json');
    const readmePath = path.resolve('README.md');

    let assetManifest: any, licenseManifest: any, mapData: any, readmeContent = '';

    try {
        assetManifest = JSON.parse(await fs.readFile(assetManifestPath, 'utf-8'));
        if (!assetManifest.assets || assetManifest.assets.length === 0) {
            console.error('❌ asset-manifest.json is empty or invalid.');
            hasErrors = true;
        }
    } catch (e) {
        console.error(`❌ Failed to read or parse ${assetManifestPath}`);
        hasErrors = true;
    }

    try {
        licenseManifest = JSON.parse(await fs.readFile(licenseManifestPath, 'utf-8'));
    } catch (e) {
        console.error(`❌ Failed to read or parse ${licenseManifestPath}`);
        hasErrors = true;
    }

    try {
        mapData = JSON.parse(await fs.readFile(mapDataPath, 'utf-8'));
    } catch (e) {
        console.error(`❌ Failed to read or parse ${mapDataPath}`);
        hasErrors = true;
    }

    try {
        readmeContent = await fs.readFile(readmePath, 'utf-8');
        if (readmeContent.includes('WorldX')) {
            console.error('❌ README.md still references WorldX.');
            hasErrors = true;
        }
    } catch (e) {
        // console.error(`❌ Failed to read ${readmePath}`);
        // hasErrors = true;
    }

    if (hasErrors) process.exit(1);

    const licensedAssetIds = new Set(licenseManifest.assets.map((a: any) => a.assetId));
    const definedAssetIds = new Set(assetManifest.assets.map((a: any) => a.id));

    // Check assets
    for (const asset of assetManifest.assets) {
        const fullPath = path.resolve(`.${asset.path}`);
        try {
            await fs.access(fullPath);
            const isGlb = await checkGlbMagic(fullPath);
            if (!isGlb) {
                console.error(`❌ File ${asset.path} is not a valid binary GLB (invalid magic bytes).`);
                hasErrors = true;
            }
        } catch {
            console.error(`❌ Asset file missing: ${asset.path} (ID: ${asset.id})`);
            hasErrors = true;
        }

        if (!licensedAssetIds.has(asset.id)) {
            console.error(`❌ Asset missing from license-manifest: ${asset.id}`);
            hasErrors = true;
        }
    }

    // Check map data references
    const mapArrays = ['buildings', 'roads', 'props', 'nature', 'resourceNodes', 'npcSpawns'];
    for (const arrayName of mapArrays) {
        const entities = mapData[arrayName] || [];
        for (const entity of entities) {
            // Procedural entities might not have assetId but should have a kind
            if (entity.kind) {
                continue; 
            }
            
            if (!entity.assetId) {
                console.error(`❌ Map [${arrayName}] entity [${entity.id}] has no assetId AND no procedural kind.`);
                hasErrors = true;
                continue;
            }

            if (!definedAssetIds.has(entity.assetId)) {
                console.error(`❌ Map [${arrayName}] references undefined assetId: ${entity.assetId} (Entity: ${entity.id})`);
                hasErrors = true;
            }
        }
    }

    if (hasErrors) {
        console.error('\n❌ Validation FAILED.');
        process.exit(1);
    } else {
        console.log('\n✅ Validation PASSED.');
        console.log(`   - ${assetManifest.assets.length} assets validated.`);
        console.log(`   - Map references are intact (including procedural kind bypass).`);
        console.log(`   - GLB binary headers verified.`);
    }
}

main().catch(console.error);
