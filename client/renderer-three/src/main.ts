import { RendererApp } from './core/RendererApp.js';
import { AssetRegistry } from './core/AssetRegistry.js';
import { EntityFactory } from './core/EntityFactory.js';
import { MapLoader } from './core/MapLoader.js';
import { NpcRenderSystem } from './systems/NpcRenderSystem.js';
import { GroundSystem } from './systems/GroundSystem.js';
import { SelectionSystem } from './systems/SelectionSystem.js';

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
  new SelectionSystem(app.scene, app.camera, registry);
  const npcSystem = new NpcRenderSystem(app.scene, factory);

  app.addUpdatable((delta) => {
    npcSystem.update(delta);
  });

  // 4. Backend Socket connection deferred — will be handled when server is running
}

bootstrap().catch(console.error);
