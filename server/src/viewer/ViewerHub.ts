import type { NpcMovedEvent, ServerMessage } from '@jingzhong-biancheng/shared';
import type { WebSocket } from 'ws';

import type { QtownWorldEvent, WorldRuntime } from '../engine/WorldRuntime.js';

const OPEN = 1;
const MAX_BUFFERED_BYTES = 1024 * 1024;

export class ViewerHub {
  private readonly clients = new Set<WebSocket>();

  constructor(
    private readonly runtime: WorldRuntime,
    private readonly now: () => number = Date.now
  ) {}

  get viewerCount(): number {
    return this.clients.size;
  }

  add(client: WebSocket): void {
    this.clients.add(client);
    this.syncViewerCount();
  }

  remove(client: WebSocket): void {
    this.clients.delete(client);
    this.syncViewerCount();
  }

  sendStatus(client: WebSocket): void {
    const status = this.runtime.getStatus();
    this.send(
      client,
      this.createMessage('world_status', {
        simulationMode: status.simulationMode,
        viewerCount: status.viewerCount,
        gameTime: status.gameTime,
      })
    );
  }

  sendPong(client: WebSocket, clientSeq: number): void {
    this.send(client, this.createMessage('pong', { clientSeq }));
  }

  sendError(client: WebSocket, code: string, message: string): void {
    this.send(client, this.createMessage('error', { code, message }));
  }

  /**
   * Broadcast a QtownWorldEvent to all connected viewers.
   * Wraps the event in the standard ServerMessage envelope.
   */
  broadcastEvent(event: QtownWorldEvent): void {
    const message = this.createMessage('qtown_event', event);
    this.broadcast(message);
  }

  broadcastStatus(): void {
    const status = this.runtime.getStatus();
    this.broadcast(
      this.createMessage('world_status', {
        simulationMode: status.simulationMode,
        viewerCount: status.viewerCount,
        gameTime: status.gameTime,
      })
    );
  }

  private createMessage(type: string, payload: unknown): ServerMessage {
    return {
      type,
      worldId: this.runtime.worldId,
      seq: this.runtime.currentTick,
      serverTime: this.now(),
      payload,
    } as ServerMessage;
  }

  private send(client: WebSocket, message: ServerMessage): void {
    if (client.readyState === OPEN) {
      client.send(JSON.stringify(message));
    }
  }

  private broadcast(message: ServerMessage): void {
    const text = JSON.stringify(message);

    for (const client of this.clients) {
      if (client.readyState !== OPEN || client.bufferedAmount > MAX_BUFFERED_BYTES) {
        continue;
      }
      client.send(text);
    }
  }

  private syncViewerCount(): void {
    this.runtime.setViewerCount(this.viewerCount);
  }
}
