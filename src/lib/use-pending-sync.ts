import { useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';

/** Changes not yet confirmed by the server, as stored on the device. */
interface StoredPending {
  upserts: string[];
  deletes: string[];
}

interface PendingSyncOptions<T extends { id: string }> {
  /** Supabase table, e.g. 'todos'. */
  table: string;
  /** Label used in log messages, e.g. 'Tasks'. */
  label: string;
  /** AsyncStorage key that keeps unsent changes for a user. */
  storageKey: (userId: string) => string;
  /** The latest local items (read when sending, so the newest version goes out). */
  getItems: () => T[];
  toRow: (item: T, userId: string) => object;
  /** Return true for errors that mean "cloud sync cannot work" (e.g. a missing table): sending stops until the next load. */
  isFatalError?: (error: { code?: string; message?: string }) => boolean;
}

/**
 * Keeps local changes in a queue until Supabase confirms them, so nothing is lost offline or on failure.
 *
 * - `markChanged(saved, deleted)` records changes and sends them soon (several quick changes go out together).
 * - Unsent changes are saved on the device and retried by `load` + `flush` on the next start.
 * - Requests run one at a time, in order, so a delete and a later restore can never arrive swapped.
 */
export function usePendingSync<T extends { id: string }>(options: PendingSyncOptions<T>) {
  // Options are read once; pass functions that read refs (e.g. getItems: () => itemsRef.current).
  const optionsRef = useRef(options);

  const userIdRef = useRef<string | null>(null);
  const enabledRef = useRef(true);
  // id -> change counter, so an item changed again while being sent stays pending.
  const upsertsRef = useRef<Map<string, number>>(new Map());
  const deletesRef = useRef<Map<string, number>>(new Map());
  const counterRef = useRef(0);
  const queueRef = useRef<Promise<void>>(Promise.resolve());
  const scheduledRef = useRef(false);

  const save = useCallback(() => {
    const uid = userIdRef.current;
    if (!uid) return;
    const data: StoredPending = { upserts: [...upsertsRef.current.keys()], deletes: [...deletesRef.current.keys()] };
    AsyncStorage.setItem(optionsRef.current.storageKey(uid), JSON.stringify(data)).catch((e) =>
      console.warn(`${optionsRef.current.label} sync: failed to save pending changes:`, e)
    );
  }, []);

  /** Switches to another user (or none) and loads that user's unsent changes. */
  const load = useCallback(async (userId: string | null) => {
    userIdRef.current = userId;
    enabledRef.current = true;
    upsertsRef.current = new Map();
    deletesRef.current = new Map();
    scheduledRef.current = false;
    if (!userId) return;
    try {
      const raw = await AsyncStorage.getItem(optionsRef.current.storageKey(userId));
      const stored: StoredPending | null = raw ? JSON.parse(raw) : null;
      if (userIdRef.current !== userId) return;
      stored?.upserts?.forEach((id) => upsertsRef.current.set(id, ++counterRef.current));
      stored?.deletes?.forEach((id) => deletesRef.current.set(id, ++counterRef.current));
    } catch (e) {
      console.warn(`${optionsRef.current.label} sync: failed to read pending changes:`, e);
    }
  }, []);

  /** Runs a cloud request after the ones before it. Errors are logged, never thrown. */
  const enqueue = useCallback((job: () => Promise<void>) => {
    const run = queueRef.current.then(job).catch((e) => {
      const { label, isFatalError } = optionsRef.current;
      if (e && typeof e === 'object' && 'code' in e && isFatalError?.(e)) {
        enabledRef.current = false;
      }
      console.warn(`${label} sync:`, e?.message ?? e);
    });
    queueRef.current = run;
    return run;
  }, []);

  /** Sends all pending changes now. Failed ones stay pending. Throws the Supabase error on failure. */
  const flush = useCallback(async () => {
    const uid = userIdRef.current;
    if (!uid || !enabledRef.current) return;
    const { table, getItems, toRow } = optionsRef.current;
    const upserts = new Map(upsertsRef.current);
    const deletes = new Map(deletesRef.current);
    if (upserts.size === 0 && deletes.size === 0) return;

    if (deletes.size > 0) {
      const { error } = await supabase.from(table).delete().eq('user_id', uid).in('id', [...deletes.keys()]);
      if (error) throw error;
      deletes.forEach((n, id) => {
        if (deletesRef.current.get(id) === n) deletesRef.current.delete(id);
      });
    }

    if (upserts.size > 0) {
      const rows = getItems()
        .filter((item) => upserts.has(item.id))
        .map((item) => toRow(item, uid));
      if (rows.length > 0) {
        const { error } = await supabase.from(table).upsert(rows);
        if (error) throw error;
      }
      upserts.forEach((n, id) => {
        if (upsertsRef.current.get(id) === n) upsertsRef.current.delete(id);
      });
    }

    if (userIdRef.current === uid) save();
  }, [save]);

  /** Sends pending changes soon; quick successive changes are combined. */
  const scheduleFlush = useCallback(() => {
    if (!userIdRef.current || scheduledRef.current) return;
    scheduledRef.current = true;
    enqueue(async () => {
      scheduledRef.current = false;
      await flush();
    });
  }, [enqueue, flush]);

  /** Records items to save in the cloud and ids to delete there. */
  const markChanged = useCallback(
    (saved: string[], deleted: string[] = []) => {
      if (!userIdRef.current || (saved.length === 0 && deleted.length === 0)) return;
      saved.forEach((id) => {
        deletesRef.current.delete(id);
        upsertsRef.current.set(id, ++counterRef.current);
      });
      deleted.forEach((id) => {
        upsertsRef.current.delete(id);
        deletesRef.current.set(id, ++counterRef.current);
      });
      save();
      scheduleFlush();
    },
    [save, scheduleFlush]
  );

  const isPendingUpsert = useCallback((id: string) => upsertsRef.current.has(id), []);
  const isPendingDelete = useCallback((id: string) => deletesRef.current.has(id), []);
  const isEnabled = useCallback(() => enabledRef.current, []);

  return { load, enqueue, flush, scheduleFlush, markChanged, isPendingUpsert, isPendingDelete, isEnabled };
}
