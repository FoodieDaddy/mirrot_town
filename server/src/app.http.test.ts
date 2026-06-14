import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import { buildServer, type ServerContext } from './app.js';

const MAP_PATH = path.resolve(__dirname, '../../maps/qtown_v0_1.json');

describe('HTTP API', () => {
  let context: ServerContext | undefined;

  afterEach(async () => {
    await context?.app.close();
    context = undefined;
  });

  it('reports health', async () => {
    context = await buildServer({
      autoStart: false,
      now: () => 1_710_000_000_000,
    });

    const health = await context.app.inject({
      method: 'GET',
      url: '/api/health',
    });

    expect(health.statusCode).toBe(200);
    expect(health.json()).toEqual({
      ok: true,
      serverTime: 1_710_000_000_000,
    });
  });

  it('returns world status', async () => {
    context = await buildServer({
      autoStart: false,
      now: () => 1_710_000_000_000,
    });
    context.runtime.start();

    const status = await context.app.inject({
      method: 'GET',
      url: '/api/worlds/qtown_v0_1/status',
    });

    expect(status.statusCode).toBe(200);
    expect(status.json()).toMatchObject({
      worldId: 'qtown_v0_1',
      status: 'RUNNING',
      simulationMode: 'OFFLINE_LOW_FREQ',
      viewerCount: 0,
    });
  });

  it('returns 404 for unknown world status', async () => {
    context = await buildServer({
      autoStart: false,
    });

    const missing = await context.app.inject({
      method: 'GET',
      url: '/api/worlds/unknown/status',
    });

    expect(missing.statusCode).toBe(404);
  });

  it('returns snapshot with qtown format and rejects unknown worlds', async () => {
    context = await buildServer({
      autoStart: false,
      now: () => 1_710_000_000_000,
      seedPath: MAP_PATH,
    });

    const snapshot = await context.app.inject({
      method: 'GET',
      url: '/api/worlds/qtown_v0_1/snapshot',
    });

    expect(snapshot.statusCode).toBe(200);
    const body = snapshot.json();
    expect(body.worldId).toBe('qtown_v0_1');
    expect(body.mapId).toBe('qtown_v0_1');
    expect(body.tick).toBe(0);
    expect(body.npcs).toBeDefined();
    expect(body.buildings).toBeDefined();
    expect(body.time).toMatchObject({ day: 1, hour: 8, minute: 0 });
  });

  it('returns 404 for unknown world snapshot', async () => {
    context = await buildServer({
      autoStart: false,
    });

    const missing = await context.app.inject({
      method: 'GET',
      url: '/api/worlds/missing/snapshot',
    });

    expect(missing.statusCode).toBe(404);
    expect(missing.json()).toEqual({ error: 'WORLD_NOT_FOUND' });
  });
});
