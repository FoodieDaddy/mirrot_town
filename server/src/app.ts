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

  // Subscribe to Qtown world events and broadcast them
  const unsubscribe = runtime.subscribe((event) => viewerHub.broadcastEvent(event));

  await app.register(websocket);

  // ─── Health check ────────────────────────────────────────
  app.get('/api/health', async () => ({
    ok: true,
    serverTime: (options.now ?? Date.now)(),
  }));

  // ─── World status ────────────────────────────────────────
  app.get<{ Params: WorldParams }>('/api/worlds/:worldId/status', async (request, reply) => {
    if (request.params.worldId !== runtime.worldId) {
      return reply.code(404).send({ error: 'WORLD_NOT_FOUND' });
    }
    return runtime.getStatus();
  });

  // ─── Qtown world snapshot ────────────────────────────────
  app.get<{ Params: WorldParams }>('/api/worlds/:worldId/snapshot', async (request, reply) => {
    if (request.params.worldId !== runtime.worldId) {
      return reply.code(404).send({ error: 'WORLD_NOT_FOUND' });
    }
    return runtime.getSnapshot();
  });

  // ─── WebSocket for world events ──────────────────────────
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

      // Send initial status on connect
      viewerHub.sendStatus(socket);

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
      // For now, just acknowledge the command
      console.log('[WorldCommand]', JSON.stringify(message.payload));
      viewerHub.sendError(socket, 'COMMAND_ACKNOWLEDGED', 'Command received but not yet processed');
      return;
    default:
      viewerHub.sendError(socket, 'INVALID_MESSAGE', `Unknown message type: ${message.type}`);
  }
}
