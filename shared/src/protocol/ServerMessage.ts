import type { GameTime } from '../time/GameTime.js';
import type { WorldDeltaChange } from './WorldDelta.js';
import type { WorldSnapshot } from './WorldSnapshot.js';

interface ServerMessageBase {
  worldId: string;
  seq: number;
  serverTime: number;
}

export interface WorldStatusServerMessage extends ServerMessageBase {
  type: 'world_status';
  payload: {
    simulationMode: string;
    viewerCount: number;
    gameTime?: GameTime;
  };
}

export interface WorldDeltaServerMessage extends ServerMessageBase {
  type: 'world_delta';
  payload: {
    changes: readonly WorldDeltaChange[];
    gameTime?: GameTime;
  };
}

export interface WorldSnapshotServerMessage extends ServerMessageBase {
  type: 'world_snapshot';
  payload: WorldSnapshot;
}

export interface ResyncRequiredServerMessage extends ServerMessageBase {
  type: 'resync_required';
  payload: {
    reason: string;
  };
}

export interface ErrorServerMessage extends ServerMessageBase {
  type: 'error';
  payload: {
    code: string;
    message: string;
  };
}

export interface ServerPingMessage extends ServerMessageBase {
  type: 'server_ping';
  payload?: {
    nonce?: string;
  };
}

export interface PongServerMessage extends ServerMessageBase {
  type: 'pong';
  payload?: {
    clientSeq?: number;
  };
}

export type ServerMessage =
  | WorldStatusServerMessage
  | WorldDeltaServerMessage
  | WorldSnapshotServerMessage
  | ResyncRequiredServerMessage
  | ErrorServerMessage
  | ServerPingMessage
  | PongServerMessage;
