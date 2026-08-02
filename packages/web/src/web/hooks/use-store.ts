import { useSyncExternalStore, useMemo } from "react";
import {
  subscribe,
  getVersion,
  subscribeStatus,
  getSyncSnapshot,
  getAll,
  getSingleton,
  type Collection,
  type Singleton,
  type Row,
} from "../lib/store";

function useVersion() {
  return useSyncExternalStore(subscribe, getVersion, getVersion);
}

/** Reactive list from a collection table, recomputed on any store change. */
export function useTable<T = Row>(
  table: Collection,
  compute?: (rows: T[]) => T[],
): T[] {
  const v = useVersion();
  return useMemo(() => {
    const rows = getAll<T>(table);
    return compute ? compute(rows) : rows;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [v, table]);
}

/** Reactive singleton row (userProfile / hifdzSettings). */
export function useSingleton<T = Row>(table: Singleton): T | undefined {
  const v = useVersion();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => getSingleton<T>(table), [v, table]);
}

export function useSyncStatus() {
  return useSyncExternalStore(subscribeStatus, getSyncSnapshot, getSyncSnapshot);
}
