import type { WorldEvent, QtownWorldSnapshot, WorldCommand } from '@jingzhong-biancheng/shared';
import { RendererApp } from './core/RendererApp.js';
import { AssetRegistry } from './core/AssetRegistry.js';
import { EntityFactory } from './core/EntityFactory.js';
import { MapLoader } from './core/MapLoader.js';
import { NpcRenderSystem } from './systems/NpcRenderSystem.js';
import { GroundSystem } from './systems/GroundSystem.js';
import { SelectionSystem } from './systems/SelectionSystem.js';
import { WorldConnection } from './protocol/WorldConnection.js';
import { adaptSnapshot } from './protocol/WorldSnapshotAdapter.js';
import { WorldCommandAdapter } from './protocol/WorldCommandAdapter.js';

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

  // 2. Load and build map (static layout: buildings, roads, nature, props)
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
  const commandAdapter = new WorldCommandAdapter();
  new SelectionSystem(app.scene, app.camera, registry, commandAdapter);

  const npcSystem = new NpcRenderSystem(app.scene, factory);

  app.addUpdatable((delta) => {
    npcSystem.update(delta);
  });

  // 4. Connect to backend world server
  const worldId = 'qtown_v0_1';
  const connection = new WorldConnection(worldId);

  // Update debug overlay when connection state changes
  connection.onStateChange((state) => {
    updateDebugOverlay(state, npcSystem.npcCount);
  });

  // Forward world events to NpcRenderSystem
  connection.eventAdapter.onEvent((event: WorldEvent) => {
    npcSystem.handleEvent(event);
  });

  // Forward commands to console (and eventually to server)
  commandAdapter.setCommandHandler((command: WorldCommand) => {
    console.log('[Command]', command);
  });

  // 5. Try to fetch snapshot from backend
  try {
    const snapshot = await connection.fetchSnapshot();
    console.log('[WorldConnection] Snapshot loaded:', snapshot.worldId, 'tick:', snapshot.tick);

    // Apply snapshot NPC positions (override map-spawned NPCs)
    const entityState = adaptSnapshot(snapshot);
    npcSystem.applySnapshotNpcs(entityState.npcs);

    const snapshotEl = document.getElementById('debug-snapshot');
    if (snapshotEl) {
      snapshotEl.innerHTML = `snapshot: loaded (tick ${snapshot.tick})`;
    }
  } catch (err) {
    console.warn('[WorldConnection] Failed to fetch snapshot — running in offline mode:', err);
    const snapshotEl = document.getElementById('debug-snapshot');
    if (snapshotEl) {
      snapshotEl.innerHTML = '<span class="warning">snapshot: offline</span>';
    }
  }

  // 6. Connect WebSocket for real-time events
  connection.connectWebSocket();

  const wsEl = document.getElementById('debug-ws');
  if (wsEl) {
    wsEl.innerHTML = 'ws: connecting...';
  }

  // Update WS status periodically
  setInterval(() => {
    const state = connection.state;
    const wsEl = document.getElementById('debug-ws');
    if (wsEl) {
      wsEl.innerHTML = state.wsConnected
        ? 'ws: <span style="color:#0f0">connected</span>'
        : 'ws: <span class="warning">disconnected</span>';
    }
    const worldEl = document.getElementById('debug-world');
    if (worldEl) {
      worldEl.innerHTML = `world: ${state.snapshot?.worldId ?? '—'}`;
    }
    const tickEl = document.getElementById('debug-tick');
    if (tickEl) {
      tickEl.innerHTML = `tick: ${state.tick}`;
    }
    const npcEl = document.getElementById('debug-npcs');
    if (npcEl) {
      npcEl.innerHTML = `npcs: ${npcSystem.npcCount}`;
    }
    const eventsEl = document.getElementById('debug-events');
    if (eventsEl) {
      eventsEl.innerHTML = `events: ${state.eventCount}`;
    }
    const lastEventEl = document.getElementById('debug-last-event');
    if (lastEventEl) {
      lastEventEl.innerHTML = state.lastEventType ? `last: ${state.lastEventType}` : 'last: —';
    }
  }, 500);
}

function updateDebugOverlay(
  state: {
    snapshotLoaded: boolean;
    wsConnected: boolean;
    eventCount: number;
    lastEventType: string | null;
    tick: number;
    snapshot: QtownWorldSnapshot | null;
  },
  _npcCount: number
) {
  const snapshotEl = document.getElementById('debug-snapshot');
  if (snapshotEl) {
    snapshotEl.innerHTML = state.snapshotLoaded
      ? `snapshot: loaded (tick ${state.tick})`
      : '<span class="warning">snapshot: not loaded</span>';
  }
}

bootstrap().catch(console.error);
