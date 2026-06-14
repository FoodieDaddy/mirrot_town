import type {
  WorldDelta,
  WorldSnapshot
} from "@jingzhong-biancheng/shared";
import { describe, expect, it, vi } from "vitest";

import { WorldStateStore } from "./WorldStateStore.js";

const snapshot = (): WorldSnapshot => ({
  type: "world_snapshot",
  worldId: "default",
  snapshotVersion: 4,
  seq: 10,
  serverTime: 1000,
  gameTime: { day: 3, hour: 9, minute: 20 },
  map: { id: 'map_a', width: 128, height: 96 },
  characters: [
    {
      characterId: "a_heng",
      name: "阿衡",
      transform: { x: 10, y: 20 }
    }
  ],
  objects: [
    {
      objectId: "wheat_1",
      templateId: "wheat",
      regionId: "farm",
      transform: { x: 4, y: 5 },
      state: { growth: "seedling", moisture: 10 }
    }
  ],
  publicEvents: []
});

const delta = (
  seq: number,
  changes: WorldDelta["changes"]
): WorldDelta => ({
  type: "world_delta",
  worldId: "default",
  seq,
  serverTime: 1000 + seq,
  changes
});

describe("WorldStateStore", () => {
  it("loads snapshots and supports entity queries", () => {
    const store = new WorldStateStore();

    store.applySnapshot(snapshot());

    expect(store.getCharacter("a_heng")?.name).toBe("阿衡");
    expect(store.getObject("wheat_1")?.state).toEqual({
      growth: "seedling",
      moisture: 10
    });
    expect(store.getState().lastSeq).toBe(10);
    expect(store.getState().map).toEqual({ id: 'map_a', width: 128, height: 96 });
  });

  it("applies renderable changes in sequence", () => {
    const store = new WorldStateStore(snapshot());

    const result = store.applyDelta(delta(11, [
      {
        type: "character_moved",
        characterId: "a_heng",
        from: { x: 10, y: 20 },
        to: { x: 18, y: 22 },
        durationMs: 3000
      },
      {
        type: "character_action_started",
        characterId: "a_heng",
        actionCode: "fish",
        targetObjectId: "river_1",
        phases: [{ phaseCode: "cast_line", durationMs: 1200 }]
      },
      {
        type: "object_added",
        objectId: "flower_1",
        templateId: "flower_pot",
        regionId: "home",
        position: { x: 12, y: 8 },
        state: { growth: "seedling" }
      },
      {
        type: "object_state_changed",
        objectId: "wheat_1",
        patch: { growth: "mature" }
      },
      {
        type: "event_created",
        event: {
          eventCode: "wage_paid",
          actorId: "a_heng",
          text: "阿衡完成喂马，得 3 钱。",
          visibility: "public"
        }
      }
    ]));

    expect(result.status).toBe("applied");
    expect(store.getCharacter("a_heng")?.transform).toEqual({ x: 18, y: 22 });
    expect(store.getCharacter("a_heng")?.currentAction).toMatchObject({
      actionCode: "fish",
      startedAt: 1011,
      targetObjectId: "river_1"
    });
    expect(store.getObject("flower_1")?.transform).toEqual({ x: 12, y: 8 });
    expect(store.getObject("wheat_1")?.state).toEqual({
      growth: "mature",
      moisture: 10
    });
    expect(store.getState().publicEvents).toHaveLength(1);
  });

  it("ignores duplicate seq values", () => {
    const store = new WorldStateStore(snapshot());
    const listener = vi.fn();
    store.subscribe(listener);

    store.applyDelta(delta(11, []));
    const result = store.applyDelta(delta(11, []));

    expect(result).toEqual({ status: "duplicate", receivedSeq: 11 });
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("detects gaps, rejects out-of-order state, and clears on snapshot", () => {
    const store = new WorldStateStore(snapshot());

    const result = store.applyDelta(delta(13, [{
      type: "object_state_changed",
      objectId: "wheat_1",
      patch: { growth: "mature" }
    }]));

    expect(result).toEqual({
      status: "gap",
      expectedSeq: 11,
      receivedSeq: 13
    });
    expect(store.hasSequenceGap()).toBe(true);
    expect(store.getObject("wheat_1")?.state.growth).toBe("seedling");

    store.applySnapshot({ ...snapshot(), snapshotVersion: 5, seq: 13 });
    expect(store.hasSequenceGap()).toBe(false);
    expect(store.getState().lastSeq).toBe(13);
  });

  it("notifies subscribers once per accepted update and can unsubscribe", () => {
    const store = new WorldStateStore();
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);

    store.applySnapshot(snapshot());
    store.applyDelta(delta(11, []));
    unsubscribe();
    store.applyDelta(delta(12, []));

    expect(listener).toHaveBeenCalledTimes(2);
  });

  it("rejects deltas for another world", () => {
    const store = new WorldStateStore(snapshot());

    expect(() => store.applyDelta({
      ...delta(11, []),
      worldId: "another"
    })).toThrow("another");
  });
});
