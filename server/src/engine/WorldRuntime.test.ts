import path from 'node:path';
import { describe, expect, it } from 'vitest';

import { WorldClock } from './WorldClock.js';
import { WorldRuntime } from './WorldRuntime.js';

const MAP_PATH = path.resolve(__dirname, '../../../maps/qtown_v0_1.json');

describe('WorldRuntime', () => {
  it('creates runtime with qtown_v0_1 worldId', () => {
    const runtime = new WorldRuntime({
      clock: new WorldClock({ tickIntervalMs: 200 }),
    });
    expect(runtime.worldId).toBe('qtown_v0_1');
  });

  it('returns status with correct worldId', () => {
    const runtime = new WorldRuntime({
      clock: new WorldClock({ tickIntervalMs: 200 }),
    });
    const status = runtime.getStatus();
    expect(status.worldId).toBe('qtown_v0_1');
    expect(status.status).toBe('STOPPED');
  });

  it('starts and stops correctly', () => {
    const runtime = new WorldRuntime({
      clock: new WorldClock({ tickIntervalMs: 200 }),
    });
    runtime.start();
    expect(runtime.getStatus().status).toBe('RUNNING');
    runtime.stop();
    expect(runtime.getStatus().status).toBe('STOPPED');
  });

  it('returns snapshot with correct structure after load', async () => {
    const runtime = new WorldRuntime({
      clock: new WorldClock({ tickIntervalMs: 200 }),
    });
    await runtime.load(MAP_PATH);

    const snapshot = runtime.getSnapshot();
    expect(snapshot.worldId).toBe('qtown_v0_1');
    expect(snapshot.mapId).toBe('qtown_v0_1');
    expect(snapshot.tick).toBe(0);
    expect(snapshot.npcs.length).toBeGreaterThan(0);
    expect(snapshot.buildings.length).toBeGreaterThan(0);
    expect(snapshot.time).toMatchObject({ day: 1, hour: 8, minute: 0 });
  });

  it('snapshot NPCs have correct fields after load', async () => {
    const runtime = new WorldRuntime({
      clock: new WorldClock({ tickIntervalMs: 200 }),
    });
    await runtime.load(MAP_PATH);

    const snapshot = runtime.getSnapshot();
    const firstNpc = snapshot.npcs[0];
    expect(firstNpc).toBeDefined();
    expect(firstNpc.id).toBeDefined();
    expect(firstNpc.displayName).toBeDefined();
    expect(firstNpc.assetId).toBeDefined();
    expect(firstNpc.position).toBeDefined();
    expect(firstNpc.position.x).toBeDefined();
    expect(firstNpc.position.z).toBeDefined();
  });

  it('snapshot buildings have correct fields after load', async () => {
    const runtime = new WorldRuntime({
      clock: new WorldClock({ tickIntervalMs: 200 }),
    });
    await runtime.load(MAP_PATH);

    const snapshot = runtime.getSnapshot();
    const firstBuilding = snapshot.buildings[0];
    expect(firstBuilding).toBeDefined();
    expect(firstBuilding.id).toBeDefined();
    expect(firstBuilding.assetId).toBeDefined();
    expect(firstBuilding.buildingType).toBeDefined();
    expect(firstBuilding.displayName).toBeDefined();
    expect(firstBuilding.status).toBe('normal');
  });
});
