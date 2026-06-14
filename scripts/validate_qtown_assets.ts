import fs from 'fs/promises';
import path from 'path';

async function main() {
    console.log('Validating Q-Town Assets...');
    
    let hasErrors = false;

    // Load manifests
    const assetManifestPath = path.resolve('assets/manifest/asset-manifest.json');
    const licenseManifestPath = path.resolve('assets/manifest/license-manifest.json');
    const mapDataPath = path.resolve('maps/qtown_v0_1.json');

    let assetManifest: any, licenseManifest: any, mapData: any;

    try {
        assetManifest = JSON.parse(await fs.readFile(assetManifestPath, 'utf-8'));
    } catch (e) {
        console.error(`❌ Failed to read ${assetManifestPath}`);
        hasErrors = true;
    }

    try {
        licenseManifest = JSON.parse(await fs.readFile(licenseManifestPath, 'utf-8'));
    } catch (e) {
        console.error(`❌ Failed to read ${licenseManifestPath}`);
        hasErrors = true;
    }

    try {
        mapData = JSON.parse(await fs.readFile(mapDataPath, 'utf-8'));
    } catch (e) {
        console.error(`❌ Failed to read ${mapDataPath}`);
        hasErrors = true;
    }

    if (hasErrors) {
        process.exit(1);
    }

    // 1. Check if all paths in asset-manifest exist
    const licensedAssetIds = new Set(licenseManifest.assets.map((a: any) => a.assetId));
    
    for (const asset of assetManifest.assets) {
        const fullPath = path.resolve(`.${asset.path}`);
        try {
            await fs.access(fullPath);
        } catch {
            console.error(`❌ Asset file missing: ${asset.path} (ID: ${asset.id})`);
            hasErrors = true;
        }

        // 2. Check if covered by license-manifest
        if (!licensedAssetIds.has(asset.id)) {
            console.error(`❌ Asset missing from license-manifest: ${asset.id}`);
            hasErrors = true;
        }
    }

    // 3. Check devOnly assets
    for (const lic of licenseManifest.assets) {
        if (!lic.commercialUse && !lic.devOnly) {
            console.error(`❌ Asset has unknown license but is not marked devOnly: ${lic.assetId}`);
            hasErrors = true;
        }
    }

    // 4. Map checks
    const definedAssetIds = new Set(assetManifest.assets.map((a: any) => a.id));
    const allMapEntities = [
        ...(mapData.buildings || []),
        ...(mapData.roads || []),
        ...(mapData.props || []),
        ...(mapData.nature || [])
    ];

    for (const entity of allMapEntities) {
        if (!definedAssetIds.has(entity.assetId)) {
            console.error(`❌ Map references undefined assetId: ${entity.assetId}`);
            hasErrors = true;
        }
    }

    if (hasErrors) {
        console.error('Validation FAILED.');
        process.exit(1);
    } else {
        console.log('✅ Validation PASSED.');
    }
}

main().catch(console.error);
