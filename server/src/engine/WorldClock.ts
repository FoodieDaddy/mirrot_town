import type { GameTime as SharedGameTime } from "@jingzhong-biancheng/shared";

type Season = "spring" | "summer" | "autumn" | "winter";

export type GameTime = Required<
  Pick<SharedGameTime, "day" | "hour" | "minute">
> & {
  season: Season;
};

export interface WorldClockOptions {
  tickIntervalMs?: number;
  gameMinutesPerTick?: number;
  initialGameTime?: GameTime;
}

const MINUTES_PER_DAY = 24 * 60;
const DAYS_PER_SEASON = 30;
const SEASONS: Season[] = [
  "spring",
  "summer",
  "autumn",
  "winter",
];

export class WorldClock {
  readonly tickIntervalMs: number;
  readonly gameMinutesPerTick: number;

  private elapsedGameMinutes: number;
  private timer: NodeJS.Timeout | undefined;
  private tickNumber = 0;

  constructor(options: WorldClockOptions = {}) {
    this.tickIntervalMs = options.tickIntervalMs ?? 200;
    this.gameMinutesPerTick = options.gameMinutesPerTick ?? 1;

    const initial = options.initialGameTime ?? {
      day: 1,
      hour: 8,
      minute: 0,
      season: "spring",
    };
    const seasonIndex = SEASONS.indexOf(initial.season);
    this.elapsedGameMinutes =
      seasonIndex * DAYS_PER_SEASON * MINUTES_PER_DAY +
      (initial.day - 1) * MINUTES_PER_DAY +
      initial.hour * 60 +
      initial.minute;
  }

  get currentTick(): number {
    return this.tickNumber;
  }

  get gameTime(): GameTime {
    const seasonLength = DAYS_PER_SEASON * MINUTES_PER_DAY;
    const seasonIndex =
      Math.floor(this.elapsedGameMinutes / seasonLength) % SEASONS.length;
    const minuteWithinSeason = this.elapsedGameMinutes % seasonLength;
    const minuteWithinDay = minuteWithinSeason % MINUTES_PER_DAY;

    return {
      day: Math.floor(minuteWithinSeason / MINUTES_PER_DAY) + 1,
      hour: Math.floor(minuteWithinDay / 60),
      minute: minuteWithinDay % 60,
      season: SEASONS[seasonIndex] ?? "spring",
    };
  }

  advance(): GameTime {
    this.tickNumber += 1;
    this.elapsedGameMinutes += this.gameMinutesPerTick;
    return this.gameTime;
  }

  start(onTick: () => void): void {
    if (this.timer) {
      return;
    }

    this.timer = setInterval(onTick, this.tickIntervalMs);
    this.timer.unref();
  }

  stop(): void {
    if (!this.timer) {
      return;
    }

    clearInterval(this.timer);
    this.timer = undefined;
  }
}
