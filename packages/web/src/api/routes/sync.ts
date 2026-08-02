import { z } from "zod";
import { and, eq, gt } from "drizzle-orm";
import { authed } from "../middleware/auth";
import { db } from "../database";
import * as schema from "../database/schema";

/**
 * Generic offline-first sync engine.
 * - Collection tables key on client-generated `id`.
 * - Singleton tables (`userProfile`, `hifdzSettings`) key on `userId`.
 * Conflicts resolve last-write-wins via `updatedAt` (ms epoch).
 */

const COLLECTION_TABLES = {
  habits: schema.habits,
  habitLogs: schema.habitLogs,
  prayerLogs: schema.prayerLogs,
  hifdzLogs: schema.hifdzLogs,
  murajaah: schema.murajaah,
  transactions: schema.transactions,
  budgets: schema.budgets,
  savingsGoals: schema.savingsGoals,
  cycleLogs: schema.cycleLogs,
  notes: schema.notes,
  journalEntries: schema.journalEntries,
  calendarEvents: schema.calendarEvents,
  khatmaPlans: schema.khatmaPlans,
  quranLogs: schema.quranLogs,
  quranBookmarks: schema.quranBookmarks,
  duaFavorites: schema.duaFavorites,
  goals: schema.goals,
  focusSessions: schema.focusSessions,
  achievements: schema.achievements,
} as const;

const SINGLETON_TABLES = {
  userProfile: schema.userProfile,
  hifdzSettings: schema.hifdzSettings,
} as const;

type CollectionName = keyof typeof COLLECTION_TABLES;
type SingletonName = keyof typeof SINGLETON_TABLES;

const isCollection = (t: string): t is CollectionName => t in COLLECTION_TABLES;
const isSingleton = (t: string): t is SingletonName => t in SINGLETON_TABLES;

const changeSchema = z.object({
  table: z.string(),
  row: z.record(z.string(), z.unknown()),
});

export const sync = {
  pull: authed
    .input(z.object({ since: z.number().default(0) }))
    .handler(async ({ input, context }) => {
      const userId = context.user.id;
      const out: Record<string, unknown[]> = {};

      for (const [name, table] of Object.entries(COLLECTION_TABLES)) {
        const rows = await db
          .select()
          .from(table as never)
          .where(
            and(
              eq((table as never as { userId: never }).userId, userId as never),
              gt((table as never as { updatedAt: never }).updatedAt, input.since as never),
            ),
          );
        out[name] = rows;
      }

      for (const [name, table] of Object.entries(SINGLETON_TABLES)) {
        const rows = await db
          .select()
          .from(table as never)
          .where(
            and(
              eq((table as never as { userId: never }).userId, userId as never),
              gt((table as never as { updatedAt: never }).updatedAt, input.since as never),
            ),
          );
        out[name] = rows;
      }

      return { serverTime: Date.now(), changes: out };
    }),

  push: authed
    .input(z.object({ changes: z.array(changeSchema) }))
    .handler(async ({ input, context }) => {
      const userId = context.user.id;

      for (const change of input.changes) {
        const { table: tableName } = change;
        const row = { ...change.row, userId } as Record<string, unknown>;
        const incomingUpdatedAt = Number(row.updatedAt ?? 0);

        if (isCollection(tableName)) {
          const table = COLLECTION_TABLES[tableName];
          const id = String(row.id);
          const existing = await db
            .select()
            .from(table as never)
            .where(eq((table as never as { id: never }).id, id as never))
            .limit(1);
          const cur = existing[0] as { updatedAt?: number; userId?: string } | undefined;
          if (cur && cur.userId !== userId) continue; // never touch another user's row
          if (!cur) {
            await db.insert(table as never).values(row as never);
          } else if (incomingUpdatedAt >= Number(cur.updatedAt ?? 0)) {
            await db
              .update(table as never)
              .set(row as never)
              .where(eq((table as never as { id: never }).id, id as never));
          }
        } else if (isSingleton(tableName)) {
          const table = SINGLETON_TABLES[tableName];
          const existing = await db
            .select()
            .from(table as never)
            .where(eq((table as never as { userId: never }).userId, userId as never))
            .limit(1);
          const cur = existing[0] as { updatedAt?: number } | undefined;
          if (!cur) {
            await db.insert(table as never).values(row as never);
          } else if (incomingUpdatedAt >= Number(cur.updatedAt ?? 0)) {
            await db
              .update(table as never)
              .set(row as never)
              .where(eq((table as never as { userId: never }).userId, userId as never));
          }
        }
      }

      return { ok: true, serverTime: Date.now() };
    }),

  /** Ensures a profile + settings row exists; returns them. */
  bootstrap: authed.handler(async ({ context }) => {
    const userId = context.user.id;
    const now = Date.now();

    const prof = await db
      .select()
      .from(schema.userProfile)
      .where(eq(schema.userProfile.userId, userId))
      .limit(1);
    if (!prof[0]) {
      await db
        .insert(schema.userProfile)
        .values({ userId, displayName: context.user.name, updatedAt: now })
        .onConflictDoNothing();
    }

    const hs = await db
      .select()
      .from(schema.hifdzSettings)
      .where(eq(schema.hifdzSettings.userId, userId))
      .limit(1);
    if (!hs[0]) {
      await db
        .insert(schema.hifdzSettings)
        .values({ userId, updatedAt: now })
        .onConflictDoNothing();
    }

    return { ok: true };
  }),
};
