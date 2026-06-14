import { RendererApp } from './core/RendererApp.js';
import { AssetRegistry } from './core/AssetRegistry.js';
import { EntityFactory } from './core/EntityFactory.js';
import { MapLoader } from './core/MapLoader.js';
import { RoofVisibilitySystem } from './systems/RoofVisibilitySystem.js';
import { NpcRenderSystem } from './systems/NpcRenderSystem.js';
import { GroundSystem } from './systems/GroundSystem.js';
import { WorldStateStore } from '@jingzhong-biancheng/client-core';

async function bootstrap() {
    const app = new RendererApp('app');
    new GroundSystem(app.scene);

    const registry = new AssetRegistry();
    const factory = new EntityFactory(registry);
    const mapLoader = new MapLoader(factory, app.scene);

    // 1. Load manifests & prep cache
    await registry.loadManifest('/assets/manifest/asset-manifest.json');
    await registry.preloadAssets();

    const assetsEl = document.getElementById('debug-assets');
    if (assetsEl) {
        assetsEl.innerHTML = `assets: ${registry.manifest.assets.length} loaded`;
        if (registry.failedAssets.length > 0) {
            assetsEl.innerHTML += ` / <span class="error">${registry.failedAssets.length} failed</span>`;
        }
    }

    // 2. Load and build map
    const mapData = await mapLoader.load('/maps/qtown_v0_1.json');
    const mapEl = document.getElementById('debug-map');
    if (mapEl) {
        mapEl.innerHTML = `map: ${mapData.id}`;
    }

    const placeholderEl = document.getElementById('debug-placeholders');
    if (placeholderEl && factory.placeholderCount > 0) {
        placeholderEl.innerHTML = `<span class="warning">placeholders: ${factory.placeholderCount}</span>`;
    }

    // 3. Initialize systems
    new RoofVisibilitySystem(app.scene, app.camera, registry);
    const npcSystem = new NpcRenderSystem(app.scene, factory);

    app.addUpdatable((delta) => {
        npcSystem.update(delta);
    });

    // 4. Connect Backend Socket
    const store = new WorldStateStore();
    const socket = new WebSocket(`ws://localhost:3000/ws/worlds/default`);

    socket.onopen = () => {
        console.log('Connected to backend simulation');
        socket.send(JSON.stringify({
            type: 'viewer_join',
            worldId: 'default',
            clientSeq: 0,
            payload: { clientVersion: '0.1.0', platform: 'web' }
        }));
    };

    socket.onmessage = (event) => {
        try {
            const msg = JSON.parse(event.data);
            if (msg.type === 'world_snapshot') {
                store.applySnapshot(msg.payload);
                npcSystem.sync(store.getState());
            } else if (msg.type === 'world_delta') {
                store.applyDelta(msg.payload);
                npcSystem.sync(store.getState());
            }
        } catch(e) {
            console.error('WebSocket msg error:', e);
        }
    };
}

bootstrap().catch(console.error);
