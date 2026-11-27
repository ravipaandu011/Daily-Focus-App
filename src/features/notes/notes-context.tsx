import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BinNote, NoteColor, NoteItem } from '@/features/notes/types';
import {
  loadNoteBinFromStorage,
  loadNotesFromStorage,
  saveNoteBinToStorage,
  saveNotesToStorage,
} from '@/features/notes/note-storage';
import { collection, getDocs, onSnapshot, orderBy, query } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { usePendingSync } from '@/lib/use-pending-sync';
import { useAuth } from '@/features/auth/auth-context';
import { formatDateKey } from '@/utils/date';

type NoteChanges = Partial<Pick<NoteItem, 'title' | 'body' | 'color' | 'pinned' | 'date'>>;

interface NotesContextType {
  /** Sorted: pinned first, then most recently edited. */
  notes: NoteItem[];
  isLoading: boolean;
  createNote: (input: { title: string; body: string; date: string; color?: NoteColor; pinned?: boolean }) => NoteItem;
  updateNote: (id: string, changes: NoteChanges) => void;
  togglePinNote: (id: string) => void;
  /** Deleted notes kept on this device, newest first. */
  binNotes: BinNote[];
  /** Moves the note (with the content given) to the Recycle Bin. */
  deleteNote: (note: NoteItem) => void;
  /** Removes a note without keeping it in the bin (an emptied note). */
  discardNote: (id: string) => void;
  /** Puts a just-deleted note back (Undo). */
  restoreNote: (note: NoteItem) => void;
  restoreNotesFromBin: (ids: string[]) => void;
  deleteNotesPermanently: (ids: string[]) => void;
  emptyNoteBin: () => void;
  /** Replaces every note (used by backup restore). */
  replaceAllNotes: (notes: NoteItem[]) => Promise<void>;
}

const NotesContext = createContext<NotesContextType | undefined>(undefined);

const pendingKey = (userId: string) => `@daily_focus_user_${userId}_notes_pending_v1`;
const syncedKey = (userId: string) => `@daily_focus_user_${userId}_notes_synced_v1`;

function noteToDbRow(note: NoteItem, userId: string) {
  return {
    id: note.id,
    user_id: userId,
    title: note.title,
    body: note.body,
    color: note.color,
    pinned: note.pinned,
    date: note.date,
    created_at: new Date(note.createdAt).toISOString(),
    updated_at: new Date(note.updatedAt).toISOString(),
  };
}

function parseTimestampMs(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const ms = new Date(value).getTime();
    if (Number.isFinite(ms)) return ms;
  }
  if (value && typeof value === 'object' && typeof (value as { toMillis?: () => number }).toMillis === 'function') {
    return (value as { toMillis: () => number }).toMillis();
  }
  return Date.now();
}

function dbRowToNote(row: any): NoteItem {
  const createdAt = parseTimestampMs(row.created_at);
  const updatedAt = parseTimestampMs(row.updated_at);
  return {
    id: String(row.id),
    title: row.title ?? '',
    body: row.body ?? '',
    color: (row.color as NoteColor) ?? 'default',
    pinned: Boolean(row.pinned),
    createdAt,
    updatedAt,
    date: typeof row.date === 'string' && row.date ? row.date : formatDateKey(new Date(createdAt)),
  };
}

/** Notes saved before notes had dates belong to the day they were created. */
function withDate(note: NoteItem): NoteItem {
  return note.date ? note : { ...note, date: formatDateKey(new Date(note.createdAt)) };
}

function isFirestorePermissionError(error: { code?: string; message?: string } | null): boolean {
  return Boolean(error && (error.code === 'permission-denied' || /permission/i.test(error.message ?? '')));
}

function sortNotes(list: NoteItem[]): NoteItem[] {
  return [...list].sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    return b.updatedAt - a.updatedAt;
  });
}

export const NotesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const userId = user?.id ?? null;

  const [notes, setNotes] = useState<NoteItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [binNotes, setBinNotes] = useState<BinNote[]>([]);

  // Refs mirror state so every change is computed from the latest list, never a stale render.
  const notesRef = useRef<NoteItem[]>([]);
  const binRef = useRef<BinNote[]>([]);
  const userIdRef = useRef<string | null>(null);

  const { load, enqueue, flush, scheduleFlush, markChanged, isPendingUpsert, isPendingDelete, isEnabled } =
    usePendingSync<NoteItem>({
      table: 'notes',
      label: 'Notes',
      storageKey: pendingKey,
      getItems: () => notesRef.current,
      toRow: noteToDbRow,
      isFatalError: (error) => {
        if (isFirestorePermissionError(error)) {
          console.warn(
            'Notes cloud sync is off: Firestore permission denied. Check your Firestore Security Rules. Notes are still saved on this device.'
          );
          return true;
        }
        return false;
      },
    });

  const commit = useCallback((next: NoteItem[], persist = true) => {
    notesRef.current = next;
    setNotes(next);
    if (persist && userIdRef.current) saveNotesToStorage(next, userIdRef.current);
  }, []);

  const commitBin = useCallback((next: BinNote[], persist = true) => {
    binRef.current = next;
    setBinNotes(next);
    if (persist && userIdRef.current) saveNoteBinToStorage(next, userIdRef.current);
  }, []);

  // Load notes whenever the signed-in user changes, then keep them in sync.
  useEffect(() => {
    let isActive = true;
    let unsubscribeSnapshot: (() => void) | null = null;
    userIdRef.current = userId;
    const pendingLoaded = load(userId);

    if (!userId) {
      commit([], false);
      commitBin([], false);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    (async () => {
      const [cached, cachedBin] = await Promise.all([loadNotesFromStorage(userId), loadNoteBinFromStorage(userId)]);
      if (!isActive) return;
      commit(sortNotes(cached.map(withDate)), false);
      commitBin(cachedBin.map((n) => ({ ...withDate(n), deletedAt: n.deletedAt })), false);
      setIsLoading(false);

      if (!userId) return;

      await pendingLoaded; // changes made offline in an earlier session
      const hasSyncedBefore = (await AsyncStorage.getItem(syncedKey(userId))) === '1';
      if (!isActive) return;

      // Send waiting changes first, then fetch, so the server list already includes them.
      await enqueue(flush);
      if (!isActive || !isEnabled()) return;

      const notesColRef = collection(db, 'users', userId, 'notes');

      await enqueue(async () => {
        const snapshot = await getDocs(query(notesColRef, orderBy('updated_at', 'desc')));
        if (!isActive) return;

        const remote = snapshot.docs.map((docSnap) => dbRowToNote({ id: docSnap.id, ...docSnap.data() }));
        const local = notesRef.current;

        // Server copy, minus notes deleted here and not yet sent, with local edits not yet sent on top.
        const merged = new Map<string, NoteItem>();
        remote.forEach((n) => {
          if (!isPendingDelete(n.id)) merged.set(n.id, n);
        });
        local.forEach((n) => {
          if (isPendingUpsert(n.id)) merged.set(n.id, n);
        });

        const toUpload: string[] = [];
        if (!hasSyncedBefore) {
          // First sync of this account on this device: keep local-only notes (and newer local edits) and upload them.
          const localExtra = local.filter((n) => {
            const r = merged.get(n.id);
            return !r || n.updatedAt > r.updatedAt;
          });
          localExtra.forEach((n) => {
            merged.set(n.id, n);
            toUpload.push(n.id);
          });
        }
        // Otherwise local-only notes that are not pending were deleted on another device: drop them.

        commit(sortNotes([...merged.values()]));
        markChanged(toUpload);
        await AsyncStorage.setItem(syncedKey(userId), '1');
      });
      if (!isActive || !isEnabled()) return;

      // Live updates from other devices. Notes with unsent local changes keep the local version.
      unsubscribeSnapshot = onSnapshot(
        notesColRef,
        (snapshot) => {
          if (!isActive) return;
          let next = notesRef.current;
          let changed = false;

          for (const change of snapshot.docChanges()) {
            if (change.type === 'removed') {
              const deletedId = (change.doc.data()?.id as string | undefined) ?? change.doc.id;
              if (!deletedId || isPendingUpsert(deletedId)) continue;
              if (next.some((n) => n.id === deletedId)) {
                next = next.filter((n) => n.id !== deletedId);
                changed = true;
              }
              continue;
            }

            const incoming = dbRowToNote({ id: change.doc.id, ...change.doc.data() });
            if (isPendingUpsert(incoming.id) || isPendingDelete(incoming.id)) continue;
            if (binRef.current.some((n) => n.id === incoming.id)) continue;
            const existing = next.find((n) => n.id === incoming.id);
            if (existing && existing.updatedAt >= incoming.updatedAt) continue; // our own echo or stale
            next = [incoming, ...next.filter((n) => n.id !== incoming.id)];
            changed = true;
          }

          if (changed) {
            commit(sortNotes(next));
          }
        },
        (error) => {
          console.warn('Notes realtime sync error:', error);
        }
      );
    })().catch((e) => {
      console.warn('Notes: failed to load notes:', e);
      if (isActive) setIsLoading(false);
    });

    return () => {
      isActive = false;
      if (unsubscribeSnapshot) unsubscribeSnapshot();
    };
  }, [userId, commit, commitBin, load, enqueue, flush, markChanged, isPendingUpsert, isPendingDelete, isEnabled]);

  // Coming back to the app: retry changes that could not be sent.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') scheduleFlush();
    });
    return () => sub.remove();
  }, [scheduleFlush]);

  const createNote = useCallback<NotesContextType['createNote']>(
    ({ title, body, date, color = 'default', pinned = false }) => {
      const now = Date.now();
      const note: NoteItem = {
        id: `note_${now}_${Math.random().toString(36).substring(2, 8)}`,
        title,
        body,
        color,
        pinned,
        date,
        createdAt: now,
        updatedAt: now,
      };
      commit(sortNotes([note, ...notesRef.current]));
      markChanged([note.id]);
      return note;
    },
    [commit, markChanged]
  );

  const updateNote = useCallback(
    (id: string, changes: NoteChanges) => {
      const existing = notesRef.current.find((n) => n.id === id);
      if (!existing) return;
      const updated: NoteItem = { ...existing, ...changes, updatedAt: Date.now() };
      commit(sortNotes(notesRef.current.map((n) => (n.id === id ? updated : n))));
      markChanged([id]);
    },
    [commit, markChanged]
  );

  const togglePinNote = useCallback(
    (id: string) => {
      const existing = notesRef.current.find((n) => n.id === id);
      if (existing) updateNote(id, { pinned: !existing.pinned });
    },
    [updateNote]
  );

  const discardNote = useCallback(
    (id: string) => {
      if (!notesRef.current.some((n) => n.id === id)) return;
      commit(notesRef.current.filter((n) => n.id !== id));
      markChanged([], [id]);
    },
    [commit, markChanged]
  );

  const deleteNote = useCallback(
    (note: NoteItem) => {
      const binned: BinNote = { ...note, deletedAt: Date.now() };
      commitBin([binned, ...binRef.current.filter((n) => n.id !== note.id)]);
      discardNote(note.id);
    },
    [commitBin, discardNote]
  );

  /** Puts notes back in the list (with a fresh edit time) and removes them from the bin. */
  const putBack = useCallback(
    (items: NoteItem[]) => {
      if (items.length === 0) return;
      const now = Date.now();
      const restored = items.map((n) => ({ ...n, updatedAt: now }));
      const ids = new Set(restored.map((n) => n.id));
      commitBin(binRef.current.filter((n) => !ids.has(n.id)));
      commit(sortNotes([...restored, ...notesRef.current.filter((n) => !ids.has(n.id))]));
      markChanged([...ids]);
    },
    [commit, commitBin, markChanged]
  );

  const restoreNote = useCallback((note: NoteItem) => putBack([note]), [putBack]);

  const restoreNotesFromBin = useCallback(
    (ids: string[]) => {
      const idSet = new Set(ids);
      putBack(binRef.current.filter((n) => idSet.has(n.id)).map(({ deletedAt: _deletedAt, ...note }) => note));
    },
    [putBack]
  );

  const deleteNotesPermanently = useCallback(
    (ids: string[]) => {
      const idSet = new Set(ids);
      commitBin(binRef.current.filter((n) => !idSet.has(n.id)));
    },
    [commitBin]
  );

  const emptyNoteBin = useCallback(() => commitBin([]), [commitBin]);

  const replaceAllNotes = useCallback(
    async (incoming: NoteItem[]) => {
      const next = incoming.map(withDate);
      const nextIds = new Set(next.map((n) => n.id));
      const removedIds = notesRef.current.filter((n) => !nextIds.has(n.id)).map((n) => n.id);
      commit(sortNotes(next));
      markChanged([...nextIds], removedIds);
    },
    [commit, markChanged]
  );

  const value = useMemo(
    () => ({
      notes,
      isLoading,
      binNotes,
      createNote,
      updateNote,
      togglePinNote,
      deleteNote,
      discardNote,
      restoreNote,
      restoreNotesFromBin,
      deleteNotesPermanently,
      emptyNoteBin,
      replaceAllNotes,
    }),
    [
      notes,
      isLoading,
      binNotes,
      createNote,
      updateNote,
      togglePinNote,
      deleteNote,
      discardNote,
      restoreNote,
      restoreNotesFromBin,
      deleteNotesPermanently,
      emptyNoteBin,
      replaceAllNotes,
    ]
  );

  return <NotesContext.Provider value={value}>{children}</NotesContext.Provider>;
};

export function useNotes(): NotesContextType {
  const context = useContext(NotesContext);
  if (!context) {
    throw new Error('useNotes must be used within a NotesProvider');
  }
  return context;
}
