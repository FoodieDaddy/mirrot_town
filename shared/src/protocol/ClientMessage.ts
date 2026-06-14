export interface ViewerJoinClientMessage {
  type: "viewer_join";
  worldId: string;
  clientSeq: number;
  payload: {
    clientVersion: string;
    platform: string;
  };
}

export interface PingClientMessage {
  type: "ping";
  worldId: string;
  clientSeq: number;
  payload?: {
    clientTime?: number;
  };
}

export type ClientMessage = ViewerJoinClientMessage | PingClientMessage;
