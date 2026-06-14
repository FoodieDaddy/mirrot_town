/**
 * WorldEventAdapter
 * Handles incoming WorldEvents from the WebSocket and applies them to the scene.
 */
import type { WorldEvent } from '@jingzhong-biancheng/shared';

export type EventCallback = (event: WorldEvent) => void;

export class WorldEventAdapter {
  private callbacks: EventCallback[] = [];

  onEvent(callback: EventCallback): () => void {
    this.callbacks.push(callback);
    return () => {
      this.callbacks = this.callbacks.filter((cb) => cb !== callback);
    };
  }

  /**
   * Process an incoming event from the WebSocket.
   * Parses the message and dispatches to registered callbacks.
   */
  handleRawMessage(data: string): WorldEvent | null {
    try {
      const msg = JSON.parse(data);
      // The server wraps events in a ServerMessage envelope
      // msg.type === 'qtown_event' means the payload is a WorldEvent
      if (msg.type === 'qtown_event' && msg.payload) {
        const event = msg.payload as WorldEvent;
        this.dispatch(event);
        return event;
      }
      // Ignore other message types (world_status, pong, error, etc.)
      return null;
    } catch {
      console.warn('[WorldEventAdapter] Failed to parse message:', data.slice(0, 200));
      return null;
    }
  }

  private dispatch(event: WorldEvent): void {
    for (const cb of this.callbacks) {
      cb(event);
    }
  }
}
