import { describe, it, expect, vi, afterEach } from "vitest";
import {
  ymd,
  parseYmd,
  addDays,
  daysBetween,
  last7Days,
  formatIDR,
  formatCompact,
  habitStreak,
  prayerStreak,
  juzStartPage,
  juzPageCount,
  juzPages,
  cyclePageStatus,
  parseJsonSafe,
  predictCycle,
  verseOfDay,
} from "../domain";
import type { Row } from "../store";

// ---------- dates ----------
describe("ymd", () => {
  it("formats date as YYYY-MM-DD", () => {
    expect(ymd(new Date(2025, 0, 5))).toBe("2025-01-05");
    expect(ymd(new Date(2025, 11, 31))).toBe("2025-12-31");
  });
});

describe("parseYmd", () => {
  it("parses YYYY-MM-DD back to Date", () => {
    const d = parseYmd("2025-03-15");
    expect(d.getFullYear()).toBe(2025);
    expect(d.getMonth()).toBe(2); // March = 2
    expect(d.getDate()).toBe(15);
  });
});

describe("addDays", () => {
  it("adds days correctly", () => {
    expect(addDays("2025-01-01", 1)).toBe("2025-01-02");
    expect(addDays("2025-01-31", 1)).toBe("2025-02-01");
    expect(addDays("2025-12-31", 1)).toBe("2026-01-01");
  });

  it("subtracts days correctly", () => {
    expect(addDays("2025-01-02", -1)).toBe("2025-01-01");
  });
});

describe("daysBetween", () => {
  it("calculates difference between two dates", () => {
    expect(daysBetween("2025-01-01", "2025-01-02")).toBe(1);
    expect(daysBetween("2025-01-01", "2025-01-08")).toBe(7);
    expect(daysBetween("2025-01-08", "2025-01-01")).toBe(-7);
  });

  it("returns 0 for same date", () => {
    expect(daysBetween("2025-06-15", "2025-06-15")).toBe(0);
  });
});

describe("last7Days", () => {
  it("returns array of 7 YYYY-MM-DD strings", () => {
    const days = last7Days();
    expect(days).toHaveLength(7);
    days.forEach((d) => {
      expect(d).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });

  it("each day is one after the previous", () => {
    const days = last7Days();
    for (let i = 1; i < days.length; i++) {
      expect(daysBetween(days[i - 1], days[i])).toBe(1);
    }
  });
});

// ---------- currency ----------
describe("formatIDR", () => {
  it("formats as Indonesian Rupiah", () => {
    const result = formatIDR(15000);
    expect(result).toContain("15.000");
  });
});

describe("formatCompact", () => {
  it("formats large numbers compactly", () => {
    const result = formatCompact(1500000);
    expect(result).toMatch(/\d/);
  });
});

// ---------- habits ----------
describe("habitStreak", () => {
  it("returns 0 for empty set", () => {
    expect(habitStreak(new Set())).toBe(0);
  });

  it("counts consecutive days including today", () => {
    const today = ymd(new Date());
    const yesterday = addDays(today, -1);
    const done = new Set([today, yesterday]);
    expect(habitStreak(done)).toBe(2);
  });

  it("starts from yesterday if today is not done", () => {
    const yesterday = addDays(ymd(new Date()), -1);
    const dayBefore = addDays(yesterday, -1);
    const done = new Set([yesterday, dayBefore]);
    expect(habitStreak(done)).toBe(2);
  });

  it("breaks streak on gap", () => {
    const today = ymd(new Date());
    const threeDaysAgo = addDays(today, -3);
    const done = new Set([today, threeDaysAgo]);
    expect(habitStreak(done)).toBe(1); // only today
  });
});

// ---------- prayers ----------
describe("prayerStreak", () => {
  it("returns 0 for empty logs", () => {
    expect(prayerStreak(new Map())).toBe(0);
  });

  it("counts days with all 5 prayers", () => {
    const today = ymd(new Date());
    const fullDay: Row = {
      fajr: 1, dhuhr: 1, asr: 1, maghrib: 1, isha: 1,
      userId: "", id: "", updatedAt: 0, deleted: false,
    };
    const logs = new Map([[today, fullDay]]);
    expect(prayerStreak(logs)).toBe(1);
  });

  it("breaks streak if any prayer missing", () => {
    const today = ymd(new Date());
    const incompleteDay: Row = {
      fajr: 1, dhuhr: 1, asr: 1, maghrib: 0, isha: 1,
      userId: "", id: "", updatedAt: 0, deleted: false,
    };
    const logs = new Map([[today, incompleteDay]]);
    expect(prayerStreak(logs)).toBe(0);
  });
});

// ---------- hifdz ----------
describe("juzStartPage", () => {
  it("returns correct start pages", () => {
    expect(juzStartPage(1)).toBe(1);
    expect(juzStartPage(2)).toBe(21);
    expect(juzStartPage(30)).toBe(581);
  });
});

describe("juzPageCount", () => {
  it("returns 20 for juz 1-29", () => {
    for (let j = 1; j <= 29; j++) {
      expect(juzPageCount(j)).toBe(20);
    }
  });

  it("returns 24 for juz 30", () => {
    expect(juzPageCount(30)).toBe(24);
  });

  it("returns 20 for invalid juz", () => {
    expect(juzPageCount(0)).toBe(20);
    expect(juzPageCount(31)).toBe(20);
  });
});

describe("juzPages", () => {
  it("returns correct page array for juz 1", () => {
    const pages = juzPages(1);
    expect(pages).toHaveLength(20);
    expect(pages[0]).toBe(1);
    expect(pages[19]).toBe(20);
  });

  it("returns 24 pages for juz 30", () => {
    expect(juzPages(30)).toHaveLength(24);
  });
});

describe("cyclePageStatus", () => {
  it("cycles through statuses", () => {
    expect(cyclePageStatus("none")).toBe("memorized");
    expect(cyclePageStatus("memorized")).toBe("weak");
    expect(cyclePageStatus("weak")).toBe("mutqin");
    expect(cyclePageStatus("mutqin")).toBe("none");
  });
});

// ---------- utils ----------
describe("parseJsonSafe", () => {
  it("parses valid JSON", () => {
    expect(parseJsonSafe('{"a":1}', {})).toEqual({ a: 1 });
  });

  it("returns fallback for invalid JSON", () => {
    expect(parseJsonSafe("not json", [])).toEqual([]);
  });

  it("returns fallback for non-string", () => {
    expect(parseJsonSafe(123, "default")).toBe("default");
  });
});

// ---------- cycle ----------
describe("predictCycle", () => {
  it("returns clean status when no logs", () => {
    const result = predictCycle([], 28);
    expect(result.status).toBe("clean");
  });

  it("detects current period", () => {
    const today = ymd(new Date());
    const logs = [{ startDate: today, endDate: null }];
    const result = predictCycle(logs, 28);
    expect(result.status).toBe("period");
    expect(result.dayInPeriod).toBe(1);
  });

  it("predicts next start date", () => {
    const start = addDays(ymd(new Date()), -10);
    const logs = [{ startDate: start, endDate: addDays(start, 5) }];
    const result = predictCycle(logs, 28);
    expect(result.status).toBe("clean");
    expect(result.nextStart).toBeDefined();
  });
});

// ---------- verse ----------
describe("verseOfDay", () => {
  it("returns a verse object", () => {
    const verse = verseOfDay();
    expect(verse).toHaveProperty("ar");
    expect(verse).toHaveProperty("id");
    expect(verse).toHaveProperty("en");
    expect(verse).toHaveProperty("ref");
  });
});
