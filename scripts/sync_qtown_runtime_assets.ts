import fs from 'fs/promises';
import path from 'path';

async function copyDir(src: string, dest: string) {
    await fs.mkdir(dest, { recursive: true });
    const entries = await fs.readdir(src, { withFileTypes: true });
    for (const entry of entries) {
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);
        if (entry.isDirectory()) {
            await copyDir(srcPath, destPath);
        } else {
            await fs.copyFile(srcPath, destPath);
        }
    }
}

async function main() {
    console.log('Syncing Q-Town runtime assets...');

    const publicDir = path.resolve('client/renderer-three/public');
    const assetManifestPath = path.resolve('assets/manifest/asset-manifest.json');

    // 1. Verify Manifest
    try {
        const manifest = JSON.parse(await fs.readFile(assetManifestPath, 'utf-8'));
        if (!manifest.assets || manifest.assets.length === 0) {
            console.error('❌ asset-manifest.json is empty. Cannot sync.');
            process.exit(1);
        }
    } catch (e) {
        console.error('❌ Failed to read asset-manifest.json');
        process.exit(1);
    }

    // 2. Clean public dirs
    const dirsToClean = [
        path.join(publicDir, 'assets/glb'),
        path.join(publicDir, 'assets/manifest'),
        path.join(publicDir, 'maps')
    ];

    for (const dir of dirsToClean) {
        try {
            await fs.rm(dir, { recursive: true, force: true });
        } catch {}
        await fs.mkdir(dir, { recursive: true });
    }

    // 3. Copy files
    await copyDir(path.resolve('assets/glb'), path.join(publicDir, 'assets/glb'));
    await fs.copyFile(assetManifestPath, path.join(publicDir, 'assets/manifest/asset-manifest.json'));
    await fs.copyFile(path.resolve('assets/manifest/license-manifest.json'), path.join(publicDir, 'assets/manifest/license-manifest.json'));
    await fs.copyFile(path.resolve('maps/qtown_v0_1.json'), path.join(publicDir, 'maps/qtown_v0_1.json'));

    console.log('✅ Sync complete.');
    console.log(`Copied assets to: ${publicDir}`);
}

main().catch(console.error);
