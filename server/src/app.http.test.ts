import { afterEach, describe, expect, it } from "vitest";

import { buildServer, type ServerContext } from "./app.js";

describe("HTTP API", () => {
  let context: ServerContext | undefined;

  afterEach(async () => {
    await context?.app.close();
    context = undefined;
  });

  it("reports health and world status", async () => {
    context = await buildServer({
      autoStart: false,
      now: () => 1_710_000_000_000,
    });
    context.runtime.start();

    const health = await context.app.inject({
      method: "GET",
      url: "/api/health",
    });
    const status = await context.app.inject({
      method: "GET",
      url: "/api/worlds/default/status",
    });

    expect(health.statusCode).toBe(200);
    expect(health.json()).toEqual({
      ok: true,
      serverTime: 1_710_000_000_000,
    });
    expect(status.statusCode).toBe(200);
    expect(status.json()).toMatchObject({
      worldId: "default",
      status: "RUNNING",
      simulationMode: "OFFLINE_LOW_FREQ",
      viewerCount: 0,
      gameTime: { day: 1, hour: 8, minute: 0, season: "spring" },
    });
  });

  it("returns a five-character snapshot and rejects unknown worlds", async () => {
    context = await buildServer({
      autoStart: false,
      now: () => 1_710_000_000_000,
    });

    const snapshot = await context.app.inject({
      method: "GET",
      url: "/api/worlds/default/snapshot",
    });
    const missing = await context.app.inject({
      method: "GET",
      url: "/api/worlds/missing/status",
    });

    expect(snapshot.statusCode).toBe(200);
    expect(snapshot.json()).toMatchObject({
      type: "world_snapshot",
      worldId: "default",
      snapshotVersion: 1,
      seq: 0,
      serverTime: 1_710_000_000_000,
      characters: [
        { characterId: "a_heng", name: "阿衡" },
        { characterId: "lin_niang", name: "林娘" },
        { characterId: "zhou_mujiang", name: "周木匠" },
        { characterId: "shen_yifu", name: "沈医夫" },
        { characterId: "xiao_man", name: "小满" },
      ],
    });
    expect(missing.statusCode).toBe(404);
    expect(missing.json()).toEqual({ error: "WORLD_NOT_FOUND" });
  });
});
