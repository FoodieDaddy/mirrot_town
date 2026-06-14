import { describe, expect, expectTypeOf, it } from 'vitest';

import type {
  ClientMessage,
  ServerMessage,
  Transform,
  WorldDelta,
  WorldSnapshot,
} from './index.js';

describe('shared protocol', () => {
  it('models snapshot and delta messages without runtime dependencies', () => {
    const transform: Transform = { x: 1, y: 2 };
    const snapshot: WorldSnapshot = {
      type: 'world_snapshot',
      worldId: 'default',
      snapshotVersion: 7,
      seq: 12,
      serverTime: 100,
      gameTime: { day: 1, hour: 8, minute: 30 },
      characters: [{ characterId: 'a_heng', transform }],
      objects: [],
    };
    const delta: WorldDelta = {
      type: 'world_delta',
      worldId: 'default',
      seq: 8,
      serverTime: 101,
      changes: [
        {
          type: 'character_moved',
          characterId: 'a_heng',
          from: transform,
          to: { x: 2, y: 3 },
          durationMs: 500,
        },
      ],
    };
    const clientMessage: ClientMessage = {
      type: 'ping',
      worldId: 'default',
      clientSeq: 1,
    };
    const serverMessage: ServerMessage = {
      type: 'world_delta',
      worldId: delta.worldId,
      seq: delta.seq,
      serverTime: delta.serverTime,
      payload: { changes: delta.changes },
    };

    expect(snapshot.characters[0]?.transform).toEqual(transform);
    expect(serverMessage.type).toBe('world_delta');
    expectTypeOf(clientMessage).toMatchTypeOf<ClientMessage>();
  });
});
