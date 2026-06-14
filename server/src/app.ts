import websocket from '@fastify/websocket';
import type { ClientMessage } from '@jingzhong-biancheng/shared';
import Fastify, { type FastifyInstance } from 'fastify';
import type { WebSocket } from 'ws';

import { WorldRuntime, type WorldRuntimeOptions } from './engine/WorldRuntime.js';
import { ViewerHub } from './viewer/ViewerHub.js';

export interface BuildServerOptions extends WorldRuntimeOptions {
  logger?: boolean;
  autoStart?: boolean;
}

export interface ServerContext {
  app: FastifyInstance;
  runtime: WorldRuntime;
  viewerHub: ViewerHub;
}

interface WorldParams {
  worldId: string;
}

interface ParsedClientMessage {
  type: string;
  worldId: string;
  clientSeq: number;
  payload?: unknown;
}

export async function buildServer(options: BuildServerOptions = {}): Promise<ServerContext> {
  const app = Fastify({ logger: options.logger ?? false });
  const runtime = new WorldRuntime(options);

  if (options.seedPath) {
    await runtime.load(options.seedPath);
  }

  const viewerHub = new ViewerHub(runtime, options.now);
  const unsubscribe = runtime.subscribe((delta) => viewerHub.broadcastDelta(delta));

  await app.register(websocket);

  app.get('/api/health', async () => ({
    ok: true,
    serverTime: (options.now ?? Date.now)(),
  }));

  app.get<{ Params: WorldParams }>('/api/worlds/:worldId/status', async (request, reply) => {
    if (request.params.worldId !== runtime.worldId) {
      return reply.code(404).send({ error: 'WORLD_NOT_FOUND' });
    }
    return runtime.getStatus();
  });

  app.get<{ Params: WorldParams }>('/api/worlds/:worldId/snapshot', async (request, reply) => {
    if (request.params.worldId !== runtime.worldId) {
      return reply.code(404).send({ error: 'WORLD_NOT_FOUND' });
    }
    return runtime.getSnapshot();
  });

  app.get<{ Params: WorldParams }>(
    '/ws/worlds/:worldId',
    { websocket: true },
    (socket, request) => {
      const worldId = request.params.worldId;

      if (worldId !== runtime.worldId) {
        viewerHub.sendError(socket, 'WORLD_NOT_FOUND', 'Unknown world');
        socket.close(1008, 'Unknown world');
        return;
      }

      viewerHub.add(socket);

      socket.on('message', (raw) => {
        const parsed = parseClientMessage(raw.toString());

        if (!parsed.ok) {
          viewerHub.sendError(socket, 'INVALID_MESSAGE', parsed.message);
          return;
        }

        handleClientMessage(socket, parsed.message, runtime, viewerHub);
      });

      socket.once('close', () => viewerHub.remove(socket));
      socket.once('error', () => viewerHub.remove(socket));
    }
  );

  app.addHook('onClose', async () => {
    unsubscribe();
    runtime.stop();
  });

  if (options.autoStart ?? true) {
    runtime.start();
  }

  return { app, runtime, viewerHub };
}

function parseClientMessage(
  text: string
): { ok: true; message: ParsedClientMessage & ClientMessage } | { ok: false; message: string } {
  let value: unknown;

  try {
    value = JSON.parse(text);
  } catch {
    return { ok: false, message: 'Message must be valid JSON' };
  }

  if (
    typeof value !== 'object' ||
    value === null ||
    !('type' in value) ||
    typeof value.type !== 'string' ||
    !('worldId' in value) ||
    typeof value.worldId !== 'string' ||
    !('clientSeq' in value) ||
    typeof value.clientSeq !== 'number' ||
    !Number.isSafeInteger(value.clientSeq) ||
    value.clientSeq < 0
  ) {
    return { ok: false, message: 'Message envelope is invalid' };
  }

  return {
    ok: true,
    message: value as ParsedClientMessage & ClientMessage,
  };
}

function handleClientMessage(
  socket: WebSocket,
  message: ParsedClientMessage,
  runtime: WorldRuntime,
  viewerHub: ViewerHub
): void {
  if (message.worldId !== runtime.worldId) {
    viewerHub.sendError(socket, 'INVALID_MESSAGE', 'Message worldId does not match the connection');
    return;
  }

  switch (message.type) {
    case 'viewer_join':
      viewerHub.sendStatus(socket);
      return;
    case 'ping':
      viewerHub.sendPong(socket, message.clientSeq);
      return;
    case 'player_command':
      viewerHub.sendError(
        socket,
        'READ_ONLY_VIEWER',
        'Viewer connections cannot send player commands'
      );
      return;
    default:
      viewerHub.sendError(socket, 'INVALID_MESSAGE', `Unknown message type: ${message.type}`);
  }
}
