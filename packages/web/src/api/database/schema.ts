import { sqliteTable, text, integer, real, index } from "drizzle-orm/sqlite-core";
import { user } from "./auth-schema";

export * from "./auth-schema";

/**
 * Sync model (offline-first, last-write-wins):
 * Every user-data row carries a client-generated string `id`, `userId`,
 * `updatedAt` (ms epoch) and a soft-delete `deleted` flag. The sync engine
 * pulls rows updated after a cursor and pushes local changes; conflicts
 * resolve by the newer `updatedAt`.
 */

// Common columns helper is inlined per-table for clarity/type-safety.

export const userProfile = sqliteTable("user_profile", {
  userId: text("user_id").primaryKey().references(() => user.id, { onDelete: "cascade" }),
  displayName: text("display_name"),
  gender: text("gender").notNull().default("unset"), // male | female | unset
  language: text("language").notNull().default("id"), // id | en
  theme: text("theme").notNull().default("light"), // light | dark
  hifdzEnabled: integer("hifdz_enabled", { mode: "boolean" }).notNull().default(true),
  cycleEnabled: integer("cycle_enabled", { mode: "boolean" }).notNull().default(false),
  sunnahPrayers: text("sunnah_prayers").notNull().default("[]"), // JSON string[]
  cycleAvgLength: integer("cycle_avg_length").notNull().default(28),
  cyclePeriodLength: integer("cycle_period_length").notNull().default(6),
  updatedAt: integer("updated_at").notNull().default(0),
});

export const habits = sqliteTable(
  "habits",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    icon: text("icon").notNull().default("Sparkles"),
    color: text("color").notNull().default("emerald"),
    frequency: text("frequency").notNull().default("daily"), // daily | weekly
    targetPerWeek: integer("target_per_week").notNull().default(7),
    sortOrder: integer("sort_order").notNull().default(0),
    archived: integer("archived", { mode: "boolean" }).notNull().default(false),
    createdAt: integer("created_at").notNull().default(0),
    updatedAt: integer("updated_at").notNull().default(0),
    deleted: integer("deleted", { mode: "boolean" }).notNull().default(false),
  },
  (t) => [index("habits_user_idx").on(t.userId)],
);

export const habitLogs = sqliteTable(
  "habit_logs",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    habitId: text("habit_id").notNull(),
    date: text("date").notNull(), // YYYY-MM-DD
    done: integer("done", { mode: "boolean" }).notNull().default(true),
    updatedAt: integer("updated_at").notNull().default(0),
    deleted: integer("deleted", { mode: "boolean" }).notNull().default(false),
  },
  (t) => [index("habit_logs_user_idx").on(t.userId)],
);

export const prayerLogs = sqliteTable(
  "prayer_logs",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    date: text("date").notNull(), // YYYY-MM-DD
    fajr: integer("fajr").notNull().default(0), // 0 none | 1 done | 2 jamaah
    dhuhr: integer("dhuhr").notNull().default(0),
    asr: integer("asr").notNull().default(0),
    maghrib: integer("maghrib").notNull().default(0),
    isha: integer("isha").notNull().default(0),
    sunnah: text("sunnah").notNull().default("{}"), // JSON { key: boolean }
    updatedAt: integer("updated_at").notNull().default(0),
    deleted: integer("deleted", { mode: "boolean" }).notNull().default(false),
  },
  (t) => [index("prayer_logs_user_idx").on(t.userId)],
);

export const hifdzSettings = sqliteTable("hifdz_settings", {
  userId: text("user_id").primaryKey().references(() => user.id, { onDelete: "cascade" }),
  dailyPages: real("daily_pages").notNull().default(1),
  weeklyPages: real("weekly_pages").notNull().default(5),
  updatedAt: integer("updated_at").notNull().default(0),
});

export const hifdzLogs = sqliteTable(
  "hifdz_logs",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    date: text("date").notNull(),
    type: text("type").notNull().default("new"), // new | murajaah
    pages: real("pages").notNull().default(0),
    surah: text("surah"),
    ayahRange: text("ayah_range"),
    note: text("note"),
    updatedAt: integer("updated_at").notNull().default(0),
    deleted: integer("deleted", { mode: "boolean" }).notNull().default(false),
  },
  (t) => [index("hifdz_logs_user_idx").on(t.userId)],
);

export const murajaah = sqliteTable(
  "murajaah",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    label: text("label").notNull(), // e.g. "Juz 30" or "Al-Mulk"
    lastReviewed: text("last_reviewed"), // YYYY-MM-DD
    intervalDays: integer("interval_days").notNull().default(3),
    nextDue: text("next_due").notNull(), // YYYY-MM-DD
    strength: integer("strength").notNull().default(1),
    updatedAt: integer("updated_at").notNull().default(0),
    deleted: integer("deleted", { mode: "boolean" }).notNull().default(false),
  },
  (t) => [index("murajaah_user_idx").on(t.userId)],
);

export const tikrar = sqliteTable(
  "tikrar",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    surah: integer("surah").notNull(),
    ayahStart: integer("ayah_start").notNull().default(1),
    ayahEnd: integer("ayah_end").notNull().default(1),
    count: integer("count").notNull().default(0), // current repetitions
    target: integer("target").notNull().default(40), // target repetitions
    lastDate: text("last_date"), // YYYY-MM-DD
    completedAt: text("completed_at"), // YYYY-MM-DD when count >= target
    note: text("note"),
    updatedAt: integer("updated_at").notNull().default(0),
    deleted: integer("deleted", { mode: "boolean" }).notNull().default(false),
  },
  (t) => [index("tikrar_user_idx").on(t.userId)],
);

export const recurringTransactions = sqliteTable(
  "recurring_transactions",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    type: text("type").notNull().default("expense"), // income | expense
    name: text("name"),
    amount: real("amount").notNull().default(0),
    category: text("category").notNull().default("Lainnya"),
    frequency: text("frequency").notNull().default("monthly"), // monthly | weekly
    nextDate: text("next_date"), // YYYY-MM-DD
    updatedAt: integer("updated_at").notNull().default(0),
    deleted: integer("deleted", { mode: "boolean" }).notNull().default(false),
  },
  (t) => [index("recurring_transactions_user_idx").on(t.userId)],
);

export const transactions = sqliteTable(
  "transactions",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    type: text("type").notNull().default("expense"), // income | expense
    amount: real("amount").notNull().default(0),
    category: text("category").notNull().default("Lainnya"),
    note: text("note"),
    date: text("date").notNull(),
    updatedAt: integer("updated_at").notNull().default(0),
    deleted: integer("deleted", { mode: "boolean" }).notNull().default(false),
  },
  (t) => [index("transactions_user_idx").on(t.userId)],
);

export const budgets = sqliteTable(
  "budgets",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    category: text("category").notNull(),
    monthlyLimit: real("monthly_limit").notNull().default(0),
    updatedAt: integer("updated_at").notNull().default(0),
    deleted: integer("deleted", { mode: "boolean" }).notNull().default(false),
  },
  (t) => [index("budgets_user_idx").on(t.userId)],
);

export const savingsGoals = sqliteTable(
  "savings_goals",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    targetAmount: real("target_amount").notNull().default(0),
    currentAmount: real("current_amount").notNull().default(0),
    deadline: text("deadline"),
    updatedAt: integer("updated_at").notNull().default(0),
    deleted: integer("deleted", { mode: "boolean" }).notNull().default(false),
  },
  (t) => [index("savings_goals_user_idx").on(t.userId)],
);

export const cycleLogs = sqliteTable(
  "cycle_logs",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    startDate: text("start_date").notNull(),
    endDate: text("end_date"),
    flow: text("flow").notNull().default("medium"), // light | medium | heavy
    symptoms: text("symptoms").notNull().default("[]"), // JSON string[]
    note: text("note"),
    updatedAt: integer("updated_at").notNull().default(0),
    deleted: integer("deleted", { mode: "boolean" }).notNull().default(false),
  },
  (t) => [index("cycle_logs_user_idx").on(t.userId)],
);

export const notes = sqliteTable(
  "notes",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    title: text("title"),
    body: text("body").notNull().default(""),
    color: text("color").notNull().default("paper"),
    pinned: integer("pinned", { mode: "boolean" }).notNull().default(false),
    createdAt: integer("created_at").notNull().default(0),
    updatedAt: integer("updated_at").notNull().default(0),
    deleted: integer("deleted", { mode: "boolean" }).notNull().default(false),
  },
  (t) => [index("notes_user_idx").on(t.userId)],
);

export const journalEntries = sqliteTable(
  "journal_entries",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    date: text("date").notNull(),
    mood: text("mood"),
    gratitude: text("gratitude"),
    body: text("body").notNull().default(""),
    updatedAt: integer("updated_at").notNull().default(0),
    deleted: integer("deleted", { mode: "boolean" }).notNull().default(false),
  },
  (t) => [index("journal_user_idx").on(t.userId)],
);

// ---- Upgrade: new LifeOS tables ----

export const calendarEvents = sqliteTable(
  "calendar_events",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    date: text("date").notNull(), // YYYY-MM-DD
    time: text("time"), // HH:mm
    type: text("type").notNull().default("reminder"), // reminder | fasting | islamic | goal | salah
    note: text("note"),
    createdAt: integer("created_at").notNull().default(0),
    updatedAt: integer("updated_at").notNull().default(0),
    deleted: integer("deleted", { mode: "boolean" }).notNull().default(false),
  },
  (t) => [index("calendar_events_user_idx").on(t.userId)],
);

export const khatmaPlans = sqliteTable(
  "khatma_plans",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    name: text("name").notNull().default("Khatma"),
    startPage: integer("start_page").notNull().default(1),
    endPage: integer("end_page").notNull().default(604),
    totalPages: integer("total_pages").notNull().default(604),
    startDate: text("start_date").notNull(),
    targetDays: integer("target_days").notNull().default(30),
    completedPages: integer("completed_pages").notNull().default(0),
    isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
    completedAt: text("completed_at"),
    createdAt: integer("created_at").notNull().default(0),
    updatedAt: integer("updated_at").notNull().default(0),
    deleted: integer("deleted", { mode: "boolean" }).notNull().default(false),
  },
  (t) => [index("khatma_plans_user_idx").on(t.userId)],
);

export const quranLogs = sqliteTable(
  "quran_logs",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    date: text("date").notNull(), // YYYY-MM-DD (unique per day)
    pagesRead: integer("pages_read").notNull().default(0),
    ayahsRead: integer("ayahs_read").notNull().default(0),
    lastSurah: integer("last_surah"),
    lastAyah: integer("last_ayah"),
    minutesSpent: integer("minutes_spent").notNull().default(0),
    updatedAt: integer("updated_at").notNull().default(0),
    deleted: integer("deleted", { mode: "boolean" }).notNull().default(false),
  },
  (t) => [index("quran_logs_user_idx").on(t.userId)],
);

export const quranBookmarks = sqliteTable(
  "quran_bookmarks",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    surah: integer("surah").notNull(),
    ayah: integer("ayah").notNull().default(1),
    page: integer("page"),
    note: text("note"),
    createdAt: integer("created_at").notNull().default(0),
    updatedAt: integer("updated_at").notNull().default(0),
    deleted: integer("deleted", { mode: "boolean" }).notNull().default(false),
  },
  (t) => [index("quran_bookmarks_user_idx").on(t.userId)],
);

export const duaFavorites = sqliteTable(
  "dua_favorites",
  {
    id: text("id").primaryKey(), // = duaId
    userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    duaId: text("dua_id").notNull(),
    updatedAt: integer("updated_at").notNull().default(0),
    deleted: integer("deleted", { mode: "boolean" }).notNull().default(false),
  },
  (t) => [index("dua_favorites_user_idx").on(t.userId)],
);

export const goals = sqliteTable(
  "goals",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    category: text("category").notNull().default("ibadah"), // ibadah | knowledge | health | wealth | relationships | dakwah
    progress: integer("progress").notNull().default(0), // 0..100
    targetDate: text("target_date"),
    milestone: text("milestone"),
    done: integer("done", { mode: "boolean" }).notNull().default(false),
    createdAt: integer("created_at").notNull().default(0),
    updatedAt: integer("updated_at").notNull().default(0),
    deleted: integer("deleted", { mode: "boolean" }).notNull().default(false),
  },
  (t) => [index("goals_user_idx").on(t.userId)],
);

export const focusSessions = sqliteTable(
  "focus_sessions",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    date: text("date").notNull(), // YYYY-MM-DD
    durationSec: integer("duration_sec").notNull().default(0),
    mode: text("mode").notNull().default("focus"), // focus | break
    intention: text("intention"),
    completed: integer("completed", { mode: "boolean" }).notNull().default(false),
    createdAt: integer("created_at").notNull().default(0),
    updatedAt: integer("updated_at").notNull().default(0),
    deleted: integer("deleted", { mode: "boolean" }).notNull().default(false),
  },
  (t) => [index("focus_sessions_user_idx").on(t.userId)],
);

export const achievements = sqliteTable(
  "achievements",
  {
    id: text("id").primaryKey(), // = achievementId
    userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
    achievementId: text("achievement_id").notNull(),
    unlockedAt: integer("unlocked_at").notNull().default(0),
    updatedAt: integer("updated_at").notNull().default(0),
    deleted: integer("deleted", { mode: "boolean" }).notNull().default(false),
  },
  (t) => [index("achievements_user_idx").on(t.userId)],
);
