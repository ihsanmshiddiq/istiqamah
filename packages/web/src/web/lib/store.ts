import { openDB, type IDBPDatabase } from "idb";
import { client } from "./api";

/**
 * Offline-first reactive local store.
 * All feature data lives in IndexedDB and is read from an in-memory cache for
 * instant, offline access. Writes go local-first (optimistic) and are queued as
 * "dirty" until synced to the server. Sync is last-write-wins by `updatedAt`.
 */

export type Row = Record<string, unknown> & {
  id?: string;
  userId?: string;
  updatedAt: number;
  deleted?: boolean;
};

export const COLLECTIONS = [
  "habits",
  "habitLogs",
  "prayerLogs",
  "hifdzLogs",
  "murajaah",
  "tikrar",
  "transactions",
  "budgets",
  "savingsGoals",
  "recurringTransactions",
  "cycleLogs",
  "notes",
  "journalEntries",
  "calendarEvents",
  "khatmaPlans",
  "quranLogs",
  "quranBookmarks",
  "duaFavorites",
  "goals",
  "focusSessions",
  "achievements",
] as const;

export const SINGLETONS = ["userProfile", "hifdzSettings"] as const;

export type Collection = (typeof COLLECTIONS)[number];
export type Singleton = (typeof SINGLETONS)[number];
export type TableName = Collection | Singleton;

const DB_NAME = "istiqamah";
const DB_VERSION = 4;

let db: IDBPDatabase | null = null;
let userId = "";
const cache: Record<string, Map<string, Row>> = {};
const dirty = new Set<string>(); // `${table}:${id}`
let cursor = 0;

// ---- reactivity ----
let version = 0;
const listeners = new Set<() => void>();
function emit() {
  version++;
  listeners.forEach((l) => l());
}
export function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}
export function getVersion() {
  return version;
}

// ---- sync status ----
export type SyncStatus = "idle" | "syncing" | "offline" | "error";
let syncStatus: SyncStatus = "idle";
let lastSyncAt = 0;
const statusListeners = new Set<() => void>();
export function subscribeStatus(cb: () => void) {
  statusListeners.add(cb);
  return () => statusListeners.delete(cb);
}
export function getSyncSnapshot() {
  return statusSnapshot;
}
let statusSnapshot = { status: syncStatus, lastSyncAt, pending: 0 };
function setStatus(s: SyncStatus) {
  syncStatus = s;
  statusSnapshot = { status: s, lastSyncAt, pending: dirty.size };
  statusListeners.forEach((l) => l());
}

function key(table: string, id: string) {
  return `${table}:${id}`;
}

export function uid() {
  return crypto.randomUUID();
}

export function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// ---- init ----
export async function initStore(uidStr: string) {
  userId = uidStr;
  db = await openDB(DB_NAME, DB_VERSION, {
    upgrade(database) {
      for (const c of COLLECTIONS) {
        if (!database.objectStoreNames.contains(c)) database.createObjectStore(c, { keyPath: "id" });
      }
      for (const s of SINGLETONS) {
        if (!database.objectStoreNames.contains(s))
          database.createObjectStore(s, { keyPath: "userId" });
      }
      if (!database.objectStoreNames.contains("_meta"))
        database.createObjectStore("_meta", { keyPath: "key" });
      if (!database.objectStoreNames.contains("_dirty"))
        database.createObjectStore("_dirty", { keyPath: "key" });
    },
  });

  for (const t of [...COLLECTIONS, ...SINGLETONS]) {
    cache[t] = new Map();
    const rows = (await db.getAll(t)) as Row[];
    for (const r of rows) {
      const id = String((r as Row).id ?? (r as Row).userId);
      cache[t].set(id, r);
    }
  }

  const meta = (await db.get("_meta", "cursor")) as { value: number } | undefined;
  cursor = meta?.value ?? 0;
  const dirtyRows = (await db.getAll("_dirty")) as { key: string }[];
  dirtyRows.forEach((d) => dirty.add(d.key));

  emit();
  // Kick off first sync; ensure profile/settings exist server-side.
  void bootstrapAndSync();
}

async function bootstrapAndSync() {
  try {
    await client.sync.bootstrap();
  } catch {
    /* offline — will sync later */
  }
  await fullSync();
}

// ---- reads ----
export function getAll<T = Row>(table: Collection): T[] {
  if (!cache[table]) return [];
  return Array.from(cache[table].values()).filter((r) => !r.deleted) as T[];
}

export function getSingleton<T = Row>(table: Singleton): T | undefined {
  return cache[table]?.get(userId) as T | undefined;
}

export function currentUserId() {
  return userId;
}

// ---- writes ----
async function persist(table: string, row: Row) {
  if (!db) return;
  await db.put(table, row);
  const k = key(table, String(row.id ?? row.userId));
  dirty.add(k);
  await db.put("_dirty", { key: k, table, id: String(row.id ?? row.userId) });
}

export async function upsert(table: Collection, partial: Partial<Row> & { id?: string }): Promise<Row> {
  const id = partial.id ?? uid();
  const existing = cache[table]?.get(id);
  const now = Date.now();
  const row: Row = {
    ...(existing ?? { createdAt: now, deleted: false }),
    ...partial,
    id,
    userId,
    updatedAt: now,
  };
  cache[table].set(id, row);
  await persist(table, row);
  emit();
  scheduleSync();
  return row;
}

export async function remove(table: Collection, id: string) {
  const existing = cache[table]?.get(id);
  if (!existing) return;
  const row: Row = { ...existing, deleted: true, updatedAt: Date.now() };
  cache[table].set(id, row);
  await persist(table, row);
  emit();
  scheduleSync();
}

export async function setSingleton(table: Singleton, patch: Partial<Row>) {
  const existing = cache[table]?.get(userId);
  const row: Row = {
    ...(existing ?? {}),
    ...patch,
    userId,
    updatedAt: Date.now(),
  };
  cache[table].set(userId, row);
  await persist(table, row);
  emit();
  scheduleSync();
}

// ---- sync ----
let syncTimer: ReturnType<typeof setTimeout> | null = null;
function scheduleSync() {
  if (syncTimer) clearTimeout(syncTimer);
  syncTimer = setTimeout(() => void fullSync(), 800);
}

let syncing = false;
export async function fullSync() {
  if (syncing || !db) return;
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    setStatus("offline");
    return;
  }
  syncing = true;
  setStatus("syncing");
  try {
    await push();
    await pull();
    lastSyncAt = Date.now();
    setStatus("idle");
  } catch {
    setStatus(navigator.onLine ? "error" : "offline");
  } finally {
    syncing = false;
  }
}

async function push() {
  if (dirty.size === 0 || !db) return;
  const changes: { table: string; row: Row }[] = [];
  const keys: string[] = [];
  for (const k of dirty) {
    const [table, ...rest] = k.split(":");
    const id = rest.join(":");
    const row = cache[table]?.get(id);
    if (row) {
      changes.push({ table, row });
      keys.push(k);
    }
  }
  if (changes.length === 0) return;
  await client.sync.push({ changes });
  for (const k of keys) {
    dirty.delete(k);
    await db.delete("_dirty", k);
  }
}

async function pull() {
  if (!db) return;
  const res = await client.sync.pull({ since: cursor });
  const changes = res.changes as Record<string, Row[]>;
  for (const [table, rows] of Object.entries(changes)) {
    if (!cache[table]) continue;
    for (const incoming of rows) {
      const id = String(incoming.id ?? incoming.userId);
      const local = cache[table].get(id);
      const k = key(table, id);
      // Do not clobber local edits that haven't been pushed yet.
      if (dirty.has(k) && local && local.updatedAt >= incoming.updatedAt) continue;
      if (!local || incoming.updatedAt >= local.updatedAt) {
        cache[table].set(id, incoming);
        await db.put(table, incoming);
      }
    }
  }
  cursor = res.serverTime;
  await db.put("_meta", { key: "cursor", value: cursor });
  emit();
}

// react to connectivity
if (typeof window !== "undefined") {
  window.addEventListener("online", () => void fullSync());
  window.addEventListener("offline", () => setStatus("offline"));
  setInterval(() => void fullSync(), 60_000);
}
