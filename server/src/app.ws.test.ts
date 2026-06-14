import { afterEach, describe, expect, it } from 'vitest';
import WebSocket from 'ws';

import { buildServer, type ServerContext } from './app.js';

interface ReceivedMessage {
  type: string;
  worldId: string;
  seq: number;
  payload: Record<string, unknown>;
}

describe('viewer WebSocket', () => {
  let context: ServerContext | undefined;
  let client: WebSocket | undefined;

  afterEach(async () => {
    client?.close();
    await context?.app.close();
    client = undefined;
    context = undefined;
  });

  it('connects and receives initial status', async () => {
    context = await buildServer({
      autoStart: false,
      now: () => 1_710_000_000_000,
    });
    await context.app.listen({ host: '127.0.0.1', port: 0 });

    const address = context.app.server.address();
    if (!address || typeof address === 'string') {
      throw new Error('Expected a TCP address');
    }

    client = new WebSocket(`ws://127.0.0.1:${address.port}/ws/worlds/qtown_v0_1`);
    await onceOpen(client);

    // Should receive initial world_status on connect
    const statusPromise = onceMessage(client);
    client.send(
      JSON.stringify({
        type: 'viewer_join',
        worldId: 'qtown_v0_1',
        clientSeq: 1,
        payload: { clientVersion: '0.1.0', platform: 'web' },
      })
    );
    await expect(statusPromise).resolves.toMatchObject({
      type: 'world_status',
      worldId: 'qtown_v0_1',
    });
  });

  it('responds to ping with pong', async () => {
    context = await buildServer({
      autoStart: false,
      now: () => 1_710_000_000_000,
    });
    await context.app.listen({ host: '127.0.0.1', port: 0 });

    const address = context.app.server.address();
    if (!address || typeof address === 'string') {
      throw new Error('Expected a TCP address');
    }

    client = new WebSocket(`ws://127.0.0.1:${address.port}/ws/worlds/qtown_v0_1`);
    await onceOpen(client);

    const pongPromise = onceMessage(client);
    client.send(
      JSON.stringify({
        type: 'ping',
        worldId: 'qtown_v0_1',
        clientSeq: 2,
      })
    );
    await expect(pongPromise).resolves.toMatchObject({
      type: 'pong',
      payload: { clientSeq: 2 },
    });
  });

  it('acknowledges player commands', async () => {
    context = await buildServer({
      autoStart: false,
      now: () => 1_710_000_000_000,
    });
    await context.app.listen({ host: '127.0.0.1', port: 0 });

    const address = context.app.server.address();
    if (!address || typeof address === 'string') {
      throw new Error('Expected a TCP address');
    }

    client = new WebSocket(`ws://127.0.0.1:${address.port}/ws/worlds/qtown_v0_1`);
    await onceOpen(client);

    const commandResponsePromise = onceMessage(client);
    client.send(
      JSON.stringify({
        type: 'player_command',
        worldId: 'qtown_v0_1',
        clientSeq: 3,
        payload: { action: 'move' },
      })
    );
    await expect(commandResponsePromise).resolves.toMatchObject({
      type: 'error',
      payload: { code: 'COMMAND_ACKNOWLEDGED' },
    });
  });

  it('returns error for malformed messages', async () => {
    context = await buildServer({ autoStart: false });
    await context.app.listen({ host: '127.0.0.1', port: 0 });

    const address = context.app.server.address();
    if (!address || typeof address === 'string') {
      throw new Error('Expected a TCP address');
    }

    client = new WebSocket(`ws://127.0.0.1:${address.port}/ws/worlds/qtown_v0_1`);
    await onceOpen(client);

    const malformedPromise = onceMessage(client);
    client.send('{');
    await expect(malformedPromise).resolves.toMatchObject({
      type: 'error',
      payload: { code: 'INVALID_MESSAGE' },
    });
  });

  it('rejects unknown world', async () => {
    context = await buildServer({ autoStart: false });
    await context.app.listen({ host: '127.0.0.1', port: 0 });

    const address = context.app.server.address();
    if (!address || typeof address === 'string') {
      throw new Error('Expected a TCP address');
    }

    client = new WebSocket(`ws://127.0.0.1:${address.port}/ws/worlds/unknown`);
    const closePromise = new Promise<number>((resolve) => {
      client!.once('close', (code) => resolve(code));
    });
    await expect(closePromise).resolves.toBe(1008);
  });
});

function onceOpen(socket: WebSocket): Promise<void> {
  return new Promise((resolve, reject) => {
    socket.once('open', resolve);
    socket.once('error', reject);
  });
}

function onceMessage(socket: WebSocket): Promise<ReceivedMessage> {
  return new Promise((resolve, reject) => {
    socket.once('message', (data) => {
      try {
        resolve(JSON.parse(data.toString()) as ReceivedMessage);
      } catch (error) {
        reject(error);
      }
    });
    socket.once('error', reject);
  });
}
