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

  it('joins, pings, rejects commands, and receives runtime deltas', async () => {
    context = await buildServer({
      autoStart: false,
      now: () => 1_710_000_000_000,
    });
    await context.app.listen({ host: '127.0.0.1', port: 0 });

    const address = context.app.server.address();
    if (!address || typeof address === 'string') {
      throw new Error('Expected a TCP address');
    }

    client = new WebSocket(`ws://127.0.0.1:${address.port}/ws/worlds/default?clientId=test`);
    await onceOpen(client);

    const statusPromise = onceMessage(client);
    client.send(
      JSON.stringify({
        type: 'viewer_join',
        worldId: 'default',
        clientSeq: 1,
        payload: { clientVersion: '0.1.0', platform: 'web' },
      })
    );
    await expect(statusPromise).resolves.toMatchObject({
      type: 'world_status',
      worldId: 'default',
      payload: {
        simulationMode: 'ONLINE_REALTIME',
        viewerCount: 1,
      },
    });

    const pongPromise = onceMessage(client);
    client.send(
      JSON.stringify({
        type: 'ping',
        worldId: 'default',
        clientSeq: 2,
      })
    );
    await expect(pongPromise).resolves.toMatchObject({
      type: 'pong',
      payload: { clientSeq: 2 },
    });

    const commandErrorPromise = onceMessage(client);
    client.send(
      JSON.stringify({
        type: 'player_command',
        worldId: 'default',
        clientSeq: 3,
        payload: { action: 'move' },
      })
    );
    await expect(commandErrorPromise).resolves.toMatchObject({
      type: 'error',
      payload: { code: 'READ_ONLY_VIEWER' },
    });

    const deltaPromise = onceMessage(client);
    context.runtime.tick();
    await expect(deltaPromise).resolves.toMatchObject({
      type: 'world_delta',
      payload: {
        changes: [
          {
            type: 'character_moved',
            characterId: 'a_heng',
            from: { x: 10, y: 20 },
            to: { x: 11, y: 19 },
          },
        ],
      },
    });
  });

  it('returns an error for malformed and unknown messages', async () => {
    context = await buildServer({ autoStart: false });
    await context.app.listen({ host: '127.0.0.1', port: 0 });

    const address = context.app.server.address();
    if (!address || typeof address === 'string') {
      throw new Error('Expected a TCP address');
    }

    client = new WebSocket(`ws://127.0.0.1:${address.port}/ws/worlds/default`);
    await onceOpen(client);

    const malformedPromise = onceMessage(client);
    client.send('{');
    await expect(malformedPromise).resolves.toMatchObject({
      type: 'error',
      payload: { code: 'INVALID_MESSAGE' },
    });

    const unknownPromise = onceMessage(client);
    client.send(
      JSON.stringify({
        type: 'dance',
        worldId: 'default',
        clientSeq: 4,
      })
    );
    await expect(unknownPromise).resolves.toMatchObject({
      type: 'error',
      payload: { code: 'INVALID_MESSAGE' },
    });
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
