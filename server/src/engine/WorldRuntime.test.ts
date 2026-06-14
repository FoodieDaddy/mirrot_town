import { describe, expect, it, vi } from "vitest";

import { WorldClock } from "./WorldClock.js";
import { WorldRuntime } from "./WorldRuntime.js";

describe("WorldRuntime", () => {
  it("periodically emits deterministic movement after start", () => {
    vi.useFakeTimers();
    const runtime = new WorldRuntime({
      clock: new WorldClock({ tickIntervalMs: 200 }),
    });
    const listener = vi.fn();
    runtime.subscribe(listener);

    runtime.start();
    vi.advanceTimersByTime(400);
    runtime.stop();
    vi.useRealTimers();

    expect(listener).toHaveBeenCalledTimes(2);
    expect(
      listener.mock.calls.map(([delta]) => delta.changes[0]?.characterId),
    ).toEqual(["a_heng", "lin_niang"]);
  });

  it("starts with five NPCs and advances deterministically", () => {
    const runtime = new WorldRuntime({
      clock: new WorldClock({ tickIntervalMs: 200 }),
      now: () => 1_710_000_000_000,
    });
    const listener = vi.fn();
    runtime.subscribe(listener);

    const initial = runtime.getSnapshot() as {
      snapshotVersion: number;
      characters: Array<{
        characterId: string;
        transform: { x: number; y: number };
      }>;
    };
    const firstDelta = runtime.tick();
    const secondDelta = runtime.tick();

    expect(initial.characters).toHaveLength(5);
    expect(firstDelta).toEqual({
      type: "character_moved",
      characterId: "a_heng",
      from: { x: 10, y: 20 },
      to: { x: 11, y: 19 },
      durationMs: 200,
    });
    expect(secondDelta.characterId).toBe("lin_niang");
    expect(runtime.getSnapshot()).toMatchObject({
      snapshotVersion: initial.snapshotVersion + 2,
      seq: 2,
      gameTime: { day: 1, hour: 8, minute: 2, season: "spring" },
    });
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it("returns defensive snapshot character positions", () => {
    const runtime = new WorldRuntime();
    const snapshot = runtime.getSnapshot() as {
      characters: Array<{ transform: { x: number } }>;
    };
    const firstCharacter = snapshot.characters[0];

    expect(firstCharacter).toBeDefined();
    if (firstCharacter) {
      firstCharacter.transform.x = 999;
    }

    expect(runtime.getSnapshot()).not.toMatchObject({
      characters: [{ transform: { x: 999 } }],
    });
  });
});
