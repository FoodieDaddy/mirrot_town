import { pathToFileURL } from 'node:url';

import { buildServer } from './app.js';
import { WorldClock } from './engine/WorldClock.js';

export { buildServer } from './app.js';
export { WorldClock } from './engine/WorldClock.js';
export { WorldRuntime } from './engine/WorldRuntime.js';
export { ViewerHub } from './viewer/ViewerHub.js';

async function main(): Promise<void> {
  const host = process.env.HOST ?? '127.0.0.1';
  const port = Number.parseInt(process.env.PORT ?? '3000', 10);
  const worldId = process.env.WORLD_ID ?? 'qtown_v0_1';
  const ticksPerSecond = Number.parseFloat(process.env.WORLD_TICK_RATE_ONLINE ?? '5');
  const seedPath = process.env.WORLD_SEED_PATH ?? '../maps/qtown_v0_1.json';

  const tickIntervalMs =
    Number.isFinite(ticksPerSecond) && ticksPerSecond > 0
      ? Math.max(1, Math.round(1000 / ticksPerSecond))
      : 200;
  const { app } = await buildServer({
    worldId,
    logger: true,
    clock: new WorldClock({ tickIntervalMs }),
    seedPath,
  });

  await app.listen({ host, port });
  app.log.info({ worldId, ticksPerSecond }, 'world runtime and viewer server started');
}

const entrypoint = process.argv[1];
if (entrypoint && import.meta.url === pathToFileURL(entrypoint).href) {
  main().catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
}
