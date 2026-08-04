import {
  computePrayerTimes,
  localTimezoneHours,
  type PrayerTimesResult,
} from "@/lib/content/islamic";

export const COMPANION_STATUSES = [
  "idle",
  "walking",
  "sleeping",
  "reading",
  "working",
  "praying",
  "thinking",
  "celebrating",
] as const;

export type CompanionStatus = (typeof COMPANION_STATUSES)[number];

export interface DurationRange {
  min: number;
  max: number;
}

export interface WeightedStatus {
  status: CompanionStatus;
  weight: number;
}

export interface CompanionStatusConfig {
  duration: DurationRange;
  next: readonly WeightedStatus[];
}

export const COMPANION_STATUS_CONFIG: Record<CompanionStatus, CompanionStatusConfig> = {
  idle: {
    duration: { min: 12_000, max: 25_000 },
    next: [{ status: "walking", weight: 3 }, { status: "reading", weight: 2 }, { status: "working", weight: 2 }, { status: "thinking", weight: 2 }, { status: "sleeping", weight: 1 }, { status: "praying", weight: 1 }],
  },
  walking: {
    duration: { min: 8_000, max: 16_000 },
    next: [{ status: "idle", weight: 4 }, { status: "working", weight: 2 }, { status: "reading", weight: 2 }, { status: "thinking", weight: 1 }, { status: "praying", weight: 1 }],
  },
  sleeping: {
    duration: { min: 30_000, max: 75_000 },
    next: [{ status: "idle", weight: 5 }, { status: "walking", weight: 2 }, { status: "thinking", weight: 1 }, { status: "praying", weight: 1 }],
  },
  reading: {
    duration: { min: 20_000, max: 45_000 },
    next: [{ status: "idle", weight: 3 }, { status: "thinking", weight: 3 }, { status: "working", weight: 2 }, { status: "walking", weight: 1 }, { status: "praying", weight: 1 }],
  },
  working: {
    duration: { min: 25_000, max: 60_000 },
    next: [{ status: "idle", weight: 3 }, { status: "thinking", weight: 3 }, { status: "walking", weight: 2 }, { status: "reading", weight: 2 }, { status: "praying", weight: 1 }],
  },
  praying: {
    duration: { min: 25_000, max: 50_000 },
    next: [{ status: "idle", weight: 5 }, { status: "thinking", weight: 2 }, { status: "reading", weight: 1 }, { status: "walking", weight: 1 }],
  },
  thinking: {
    duration: { min: 15_000, max: 35_000 },
    next: [{ status: "idle", weight: 3 }, { status: "working", weight: 3 }, { status: "reading", weight: 2 }, { status: "walking", weight: 2 }, { status: "praying", weight: 1 }],
  },
  celebrating: {
    duration: { min: 10_000, max: 20_000 },
    next: [{ status: "idle", weight: 5 }, { status: "walking", weight: 2 }, { status: "thinking", weight: 1 }, { status: "reading", weight: 1 }],
  },
};

export interface CompanionContext {
  now: Date;
  prayerTimes: PrayerTimesResult;
}

export interface CompanionContextOptions {
  now?: Date;
  prayerTimes?: PrayerTimesResult;
  lat?: number;
  lng?: number;
  timezone?: number;
}

const DEFAULT_LOCATION = { lat: -6.2088, lng: 106.8456 };
const PRAYER_WINDOW_BEFORE_MS = 20 * 60_000;
const PRAYER_WINDOW_AFTER_MS = 25 * 60_000;

export function createCompanionContext(options: CompanionContextOptions = {}): CompanionContext {
  const now = options.now ?? new Date();
  const timezone = options.timezone ?? localTimezoneHours(now);
  return {
    now,
    prayerTimes: options.prayerTimes ?? computePrayerTimes({
      date: now,
      lat: options.lat ?? DEFAULT_LOCATION.lat,
      lng: options.lng ?? DEFAULT_LOCATION.lng,
      timezone,
    }),
  };
}

function isNearPrayer({ now, prayerTimes }: CompanionContext): boolean {
  return ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"].some((name) => {
    const difference = now.getTime() - prayerTimes[name].getTime();
    return difference >= -PRAYER_WINDOW_BEFORE_MS && difference <= PRAYER_WINDOW_AFTER_MS;
  });
}

interface ContextRule {
  matches: (context: CompanionContext) => boolean;
  weights: Partial<Record<CompanionStatus, number>>;
}

export const COMPANION_CONTEXT_RULES: readonly ContextRule[] = [
  { matches: ({ now }) => now.getHours() >= 22 || now.getHours() < 5, weights: { sleeping: 12 } },
  { matches: isNearPrayer, weights: { praying: 16 } },
  { matches: ({ now }) => now.getHours() >= 12 && now.getHours() < 14, weights: { sleeping: 3 } },
];

export function getStatusDuration(status: CompanionStatus, random = Math.random): number {
  const { min, max } = COMPANION_STATUS_CONFIG[status].duration;
  return Math.round(min + (max - min) * random());
}

export function getNextStatus(
  currentStatus: CompanionStatus,
  context: CompanionContext,
  random = Math.random,
): CompanionStatus {
  const weights = new Map(
    COMPANION_STATUS_CONFIG[currentStatus].next.map(({ status, weight }) => [status, weight]),
  );

  for (const rule of COMPANION_CONTEXT_RULES) {
    if (!rule.matches(context)) continue;
    for (const [status, bonus] of Object.entries(rule.weights) as [CompanionStatus, number][]) {
      weights.set(status, (weights.get(status) ?? 0) + bonus);
    }
  }

  const totalWeight = [...weights.values()].reduce((total, weight) => total + weight, 0);
  let threshold = random() * totalWeight;
  for (const [status, weight] of weights) {
    threshold -= weight;
    if (threshold < 0) return status;
  }

  return currentStatus;
}
