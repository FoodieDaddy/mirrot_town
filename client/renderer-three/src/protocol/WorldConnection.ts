/**
 * WorldConnection
 * Manages the connection to the backend world server:
 * - Fetches the initial snapshot via HTTP
 * - Connects to the WebSocket for real-time events
 * - Handles reconnection gracefully
 */
import type { QtownWorldSnapshot } from '@jingzhong-biancheng/shared';
import { WorldEventAdapter } from './WorldEventAdapter.js';

export interface WorldConnectionState {
  snapshotLoaded: boolean;
  wsConnected: boolean;
  snapshot: QtownWorldSnapshot | null;
  eventCount: number;
  lastEventType: string | null;
  tick: number;
}

export class WorldConnection {
  readonly eventAdapter: WorldEventAdapter;

  private worldId: string;
  private ws: WebSocket | null = null;
  private snapshot: QtownWorldSnapshot | null = null;
  private eventCount = 0;
  private lastEventType: string | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private stateListeners = new Set<(state: WorldConnectionState) => void>();

  constructor(worldId: string) {
    this.worldId = worldId;
    this.eventAdapter = new WorldEventAdapter();
  }

  get state(): WorldConnectionState {
    return {
      snapshotLoaded: this.snapshot !== null,
      wsConnected: this.ws?.readyState === WebSocket.OPEN,
      snapshot: this.snapshot,
      eventCount: this.eventCount,
      lastEventType: this.lastEventType,
      tick: this.snapshot?.tick ?? 0,
    };
  }

  onStateChange(listener: (state: WorldConnectionState) => void): () => void {
    this.stateListeners.add(listener);
    return () => this.stateListeners.delete(listener);
  }

  private notifyStateChange(): void {
    const state = this.state;
    for (const listener of this.stateListeners) {
      listener(state);
    }
  }

  /**
   * Fetch the initial snapshot from the REST API.
   */
  async fetchSnapshot(): Promise<QtownWorldSnapshot> {
    const baseUrl = this.getBaseUrl();
    const res = await fetch(`${baseUrl}/api/worlds/${this.worldId}/snapshot`);
    if (!res.ok) {
      throw new Error(`Failed to fetch snapshot: ${res.status} ${res.statusText}`);
    }
    const snapshot: QtownWorldSnapshot = await res.json();
    this.snapshot = snapshot;
    this.notifyStateChange();
    return snapshot;
  }

  /**
   * Connect to the WebSocket for real-time events.
   */
  connectWebSocket(): void {
    if (this.ws?.readyState === WebSocket.OPEN || this.ws?.readyState === WebSocket.CONNECTING) {
      return;
    }

    const wsUrl = this.getWsUrl();
    console.log(`[WorldConnection] Connecting to ${wsUrl}...`);

    try {
      this.ws = new WebSocket(wsUrl);
    } catch (err) {
      console.warn('[WorldConnection] WebSocket construction failed:', err);
      this.scheduleReconnect();
      return;
    }

    this.ws.onopen = () => {
      console.log('[WorldConnection] WebSocket connected');
      this.notifyStateChange();
    };

    this.ws.onmessage = (event) => {
      const data = typeof event.data === 'string' ? event.data : '';
      const worldEvent = this.eventAdapter.handleRawMessage(data);
      if (worldEvent) {
        this.eventCount++;
        this.lastEventType = worldEvent.type;
        this.notifyStateChange();
      }
    };

    this.ws.onclose = () => {
      console.log('[WorldConnection] WebSocket closed');
      this.ws = null;
      this.notifyStateChange();
      this.scheduleReconnect();
    };

    this.ws.onerror = () => {
      // onclose will fire after onerror
    };
  }

  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.onclose = null;
      this.ws.close();
      this.ws = null;
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      console.log('[WorldConnection] Attempting reconnect...');
      this.connectWebSocket();
    }, 3000);
  }

  private getBaseUrl(): string {
    // In dev, the Vite dev server proxies /api to the backend
    return window.location.origin;
  }

  private getWsUrl(): string {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${window.location.host}/ws/worlds/${this.worldId}`;
  }
}
