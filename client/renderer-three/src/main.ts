import { RendererApp } from './core/RendererApp';
import { AssetRegistry } from './core/AssetRegistry';
import { EntityFactory } from './core/EntityFactory';
import { MapLoader } from './core/MapLoader';
import { RoofVisibilitySystem } from './systems/RoofVisibilitySystem';
import { NpcRenderSystem } from './systems/NpcRenderSystem';

import { WorldStateStore } from '@jingzhong-biancheng/client-core';

async function bootstrap() {
    const app = new RendererApp('app');
    const registry = new AssetRegistry();
    const factory = new EntityFactory(registry);
    const mapLoader = new MapLoader(factory, app.scene);

    // 1. Load manifests & prep cache
    await registry.loadManifest('/assets/manifest/asset-manifest.json');
    await registry.preloadAssets();

    // 2. Load and build map
    await mapLoader.load('/maps/qtown_v0_1.json');

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
