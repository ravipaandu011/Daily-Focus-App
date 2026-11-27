import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { TodoItem, SubtaskItem, PriorityLevel } from '@/features/tasks/types';
import { TODO_SECTION_KEY } from '@/constants/sections';
import {
  loadTodosFromStorage,
  saveTodosToStorage,
  loadBinFromStorage,
  saveBinToStorage,
} from '@/features/tasks/todo-storage';
import { getTodayKey } from '@/utils/date';
import { collection, getDocs, onSnapshot, orderBy, query } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { usePendingSync } from '@/lib/use-pending-sync';
import { useAuth } from '@/features/auth/auth-context';

interface AddTodoParams {
  text: string;
  date?: string;
  priority?: PriorityLevel;
  tag?: string;
  subtasks?: SubtaskItem[];
  notes?: string;
}

interface EditTodoParams {
  id: string;
  text: string;
  priority?: PriorityLevel;
  tag?: string;
  subtasks?: SubtaskItem[];
  notes?: string;
}

interface TodoContextType {
  todos: TodoItem[];
  binTodos: TodoItem[];
  isLoading: boolean;
  /** Today's date key; updates when the day changes while the app is open. */
  today: string;
  selectedDate: string;
  setSelectedDate: (date: string) => void;
  getTodosForDate: (date?: string) => TodoItem[];
  getPastPendingTasks: () => TodoItem[];
  rolloverPastTasks: () => Promise<void>;
  addTodo: (params: AddTodoParams) => Promise<void>;
  addBatchTodos: (texts: string[], date?: string, tag?: string, priority?: PriorityLevel) => Promise<void>;
  toggleTodo: (id: string) => Promise<void>;
  toggleSubtask: (todoId: string, subtaskId: string) => Promise<void>;
  togglePinTodo: (id: string) => Promise<void>;
  /** Pins every given task, or unpins them all when they are all pinned already. */
  togglePinBatch: (ids: string[]) => Promise<void>;
  moveToDate: (id: string, newDate: string) => Promise<void>;
  duplicateTodo: (id: string, targetDate: string) => Promise<void>;
  editTodo: (params: EditTodoParams) => Promise<void>;
  deleteTodo: (id: string) => Promise<void>;
  deleteBatchTodos: (ids: string[]) => Promise<void>;
  toggleBatchComplete: (ids: string[], completed: boolean) => Promise<void>;
  moveBatchToDate: (ids: string[], newDate: string) => Promise<void>;
  undoDelete: () => Promise<void>;
  restoreFromBin: (id: string) => Promise<void>;
  restoreBatchFromBin: (ids: string[]) => Promise<void>;
  deletePermanently: (id: string) => Promise<void>;
  deletePermanentlyBatch: (ids: string[]) => Promise<void>;
  emptyBin: () => Promise<void>;
  importBackupData: (newTodos: TodoItem[], newBin: TodoItem[]) => Promise<void>;
  undoMessage: string;
  isUndoVisible: boolean;
  dismissUndo: () => void;
}

const TodoContext = createContext<TodoContextType | undefined>(undefined);

const pendingKey = (userId: string) => `@personal_todo_user_${userId}_pending_v1`;
const syncedKey = (userId: string) => `@personal_todo_user_${userId}_synced_v1`;

// TodoItem -> Firestore document fields
function todoToDbRow(item: TodoItem, userId: string) {
  return {
    id: String(item.id),
    user_id: userId,
    text: item.text,
    completed: Boolean(item.completed),
    section: item.section,
    date: item.date,
    pinned: Boolean(item.pinned),
    priority: item.priority ?? 'none',
    tag: item.tag ?? null,
    subtasks: item.subtasks ? JSON.stringify(item.subtasks) : '[]',
    notes: item.notes ?? null,
    created_at: typeof item.createdAt === 'number' ? new Date(item.createdAt).toISOString() : item.createdAt,
  };
}

// Firestore document -> TodoItem
function dbRowToTodo(row: any): TodoItem {
  let parsedSubtasks: SubtaskItem[] | undefined;
  if (row.subtasks) {
    try {
      parsedSubtasks = typeof row.subtasks === 'string' ? JSON.parse(row.subtasks) : row.subtasks;
    } catch {
      parsedSubtasks = undefined;
    }
  }

  let parsedCreatedAt = Date.now();
  if (typeof row.created_at === 'number') {
    parsedCreatedAt = row.created_at;
  } else if (typeof row.created_at === 'string') {
    const timeVal = new Date(row.created_at).getTime();
    if (!isNaN(timeVal)) parsedCreatedAt = timeVal;
  } else if (row.created_at && typeof row.created_at.toMillis === 'function') {
    parsedCreatedAt = row.created_at.toMillis();
  }

  return {
    id: String(row.id),
    text: row.text,
    completed: Boolean(row.completed),
    createdAt: parsedCreatedAt,
    section: row.section,
    date: row.date,
    pinned: Boolean(row.pinned),
    priority: row.priority && row.priority !== 'none' ? row.priority : undefined,
    tag: row.tag || undefined,
    subtasks: parsedSubtasks && parsedSubtasks.length > 0 ? parsedSubtasks : undefined,
    notes: row.notes || undefined,
  };
}

function todosEqual(a: TodoItem, b: TodoItem): boolean {
  return (
    a.id === b.id &&
    a.text === b.text &&
    a.completed === b.completed &&
    a.createdAt === b.createdAt &&
    a.section === b.section &&
    a.date === b.date &&
    Boolean(a.pinned) === Boolean(b.pinned) &&
    a.priority === b.priority &&
    a.tag === b.tag &&
    a.notes === b.notes &&
    JSON.stringify(a.subtasks ?? null) === JSON.stringify(b.subtasks ?? null)
  );
}

function newId(suffix = ''): string {
  return `${Date.now()}${suffix}_${Math.random().toString(36).substring(2, 8)}`;
}

/** A bin item as a normal task again. */
function fromBin(item: TodoItem): TodoItem {
  const { deletedAt: _deletedAt, ...task } = item;
  return task;
}

export const TodoProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const userId = user?.id ?? null;

  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [binTodos, setBinTodos] = useState<TodoItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [today, setToday] = useState<string>(getTodayKey);
  const [selectedDate, setSelectedDate] = useState<string>(getTodayKey);
  const [lastDeletedTodos, setLastDeletedTodos] = useState<TodoItem[]>([]);
  const [isUndoVisible, setIsUndoVisible] = useState<boolean>(false);

  // Refs mirror state so every change is computed from the latest list, never a stale render.
  const todosRef = useRef<TodoItem[]>([]);
  const binRef = useRef<TodoItem[]>([]);
  const userIdRef = useRef<string | null>(null);
  const { load, enqueue, flush, scheduleFlush, markChanged, isPendingUpsert, isPendingDelete, isEnabled } =
    usePendingSync<TodoItem>({
      table: 'todos',
      label: 'Tasks',
      storageKey: pendingKey,
      getItems: () => todosRef.current,
      toRow: todoToDbRow,
      isFatalError: (error) => {
        if (error.code === 'permission-denied' || /permission/i.test(error.message ?? '')) {
          console.warn(
            'Tasks cloud sync is off: Firestore permission denied. Check your Firestore Security Rules. Tasks are still saved on this device.'
          );
          return true;
        }
        return false;
      },
    });

  const commitTodos = useCallback((next: TodoItem[], persist = true) => {
    todosRef.current = next;
    setTodos(next);
    if (persist && userIdRef.current) saveTodosToStorage(next, userIdRef.current);
  }, []);

  const commitBin = useCallback((next: TodoItem[], persist = true) => {
    binRef.current = next;
    setBinTodos(next);
    if (persist && userIdRef.current) saveBinToStorage(next, userIdRef.current);
  }, []);

  // Load tasks whenever the signed-in user changes, then keep them in sync.
  useEffect(() => {
    let isActive = true;
    let unsubscribeSnapshot: (() => void) | null = null;
    userIdRef.current = userId;
    const pendingLoaded = load(userId);

    if (!userId) {
      commitTodos([], false);
      commitBin([], false);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    (async () => {
      const [cachedTodos, cachedBin] = await Promise.all([loadTodosFromStorage(userId), loadBinFromStorage(userId)]);
      if (!isActive) return;
      commitTodos(cachedTodos, false);
      commitBin(cachedBin, false);
      setIsLoading(false);

      if (!userId) return;

      await pendingLoaded; // changes made offline in an earlier session
      const hasSyncedBefore = (await AsyncStorage.getItem(syncedKey(userId))) === '1';
      if (!isActive) return;

      // Send waiting changes first, then fetch, so the server list already includes them.
      await enqueue(flush);
      if (!isActive || !isEnabled()) return;

      const todosColRef = collection(db, 'users', userId, 'todos');

      await enqueue(async () => {
        const snapshot = await getDocs(query(todosColRef, orderBy('created_at', 'desc')));
        if (!isActive) return;

        const remote = snapshot.docs.map((docSnap) => dbRowToTodo({ id: docSnap.id, ...docSnap.data() }));
        const remoteIds = new Set(remote.map((t) => t.id));
        const local = todosRef.current;

        // Server copy, minus tasks deleted here and not yet sent, with local edits not yet sent on top.
        const merged = new Map<string, TodoItem>();
        remote.forEach((t) => {
          if (!isPendingDelete(t.id)) merged.set(t.id, t);
        });
        local.forEach((t) => {
          if (isPendingUpsert(t.id)) merged.set(t.id, t);
        });

        const toUpload: string[] = [];
        if (!hasSyncedBefore) {
          // First sync of this account on this device: keep local-only tasks and upload them.
          const localOnly = local.filter((t) => !remoteIds.has(t.id) && !merged.has(t.id));
          localOnly.forEach((t) => {
            merged.set(t.id, t);
            toUpload.push(t.id);
          });
        }
        // Otherwise local-only tasks that are not pending were deleted on another device: drop them.

        commitTodos([...merged.values()]);
        markChanged(toUpload);
        await AsyncStorage.setItem(syncedKey(userId), '1');
      });
      if (!isActive || !isEnabled()) return;

      // Live updates from other devices. Tasks with unsent local changes keep the local version.
      unsubscribeSnapshot = onSnapshot(
        todosColRef,
        (snapshot) => {
          if (!isActive) return;
          let next = todosRef.current;
          let changed = false;

          for (const change of snapshot.docChanges()) {
            if (change.type === 'removed') {
              const deletedId = (change.doc.data()?.id as string | undefined) ?? change.doc.id;
              if (!deletedId || isPendingUpsert(deletedId)) continue;
              if (next.some((t) => t.id === deletedId)) {
                next = next.filter((t) => t.id !== deletedId);
                changed = true;
              }
              continue;
            }

            const incoming = dbRowToTodo({ id: change.doc.id, ...change.doc.data() });
            if (isPendingUpsert(incoming.id) || isPendingDelete(incoming.id)) continue;
            if (binRef.current.some((t) => t.id === incoming.id)) continue;
            const existing = next.find((t) => t.id === incoming.id);
            if (existing && todosEqual(existing, incoming)) continue;
            next = existing
              ? next.map((t) => (t.id === incoming.id ? incoming : t))
              : [incoming, ...next];
            changed = true;
          }

          if (changed) {
            commitTodos(next);
          }
        },
        (error) => {
          console.warn('Tasks realtime sync error:', error);
        }
      );
    })().catch((e) => {
      console.warn('Tasks: failed to load tasks:', e);
      if (isActive) setIsLoading(false);
    });

    return () => {
      isActive = false;
      if (unsubscribeSnapshot) unsubscribeSnapshot();
    };
  }, [userId, commitTodos, commitBin, load, enqueue, flush, markChanged, isPendingUpsert, isPendingDelete, isEnabled]);

  // Coming back to the app: retry unsent changes, and move "today" forward if the day changed.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state !== 'active') return;
      scheduleFlush();
      const now = getTodayKey();
      if (now === today) return;
      setToday(now);
      // Someone looking at the old "today" moves on to the new one.
      setSelectedDate((sel) => (sel === today ? now : sel));
    });
    return () => sub.remove();
  }, [scheduleFlush, today]);

  /** Applies a change to some tasks and queues the cloud update. */
  const updateTasks = useCallback(
    (ids: Set<string>, change: (item: TodoItem) => TodoItem) => {
      const changed: string[] = [];
      const next = todosRef.current.map((item) => {
        if (!ids.has(item.id)) return item;
        changed.push(item.id);
        return change(item);
      });
      if (changed.length === 0) return;
      commitTodos(next);
      markChanged(changed);
    },
    [commitTodos, markChanged]
  );

  const addTasks = useCallback(
    (items: TodoItem[]) => {
      if (items.length === 0) return;
      commitTodos([...items, ...todosRef.current]);
      markChanged(items.map((t) => t.id));
    },
    [commitTodos, markChanged]
  );

  const addTodo = useCallback(
    async ({ text, date, priority, tag, subtasks, notes }: AddTodoParams) => {
      const trimmed = text.trim();
      if (!trimmed) return;
      addTasks([
        {
          id: newId(),
          text: trimmed,
          completed: false,
          createdAt: Date.now(),
          section: TODO_SECTION_KEY,
          date: date || selectedDate || getTodayKey(),
          pinned: false,
          priority: priority && priority !== 'none' ? priority : undefined,
          tag: tag || undefined,
          subtasks: subtasks && subtasks.length > 0 ? subtasks : undefined,
          notes: notes?.trim() || undefined,
        },
      ]);
    },
    [selectedDate, addTasks]
  );

  const addBatchTodos = useCallback(
    async (texts: string[], date?: string, tag?: string, priority?: PriorityLevel) => {
      const lines = texts.map((t) => t.trim()).filter((t) => t.length > 0);
      const targetDate = date || selectedDate || getTodayKey();
      const baseTime = Date.now();
      addTasks(
        lines.map((line, idx) => ({
          id: newId(`_${idx}`),
          text: line,
          completed: false,
          createdAt: baseTime + idx,
          section: TODO_SECTION_KEY,
          date: targetDate,
          pinned: false,
          priority: priority && priority !== 'none' ? priority : undefined,
          tag: tag || undefined,
        }))
      );
    },
    [selectedDate, addTasks]
  );

  const toggleTodo = useCallback(
    async (id: string) => updateTasks(new Set([id]), (t) => ({ ...t, completed: !t.completed })),
    [updateTasks]
  );

  const toggleSubtask = useCallback(
    async (todoId: string, subtaskId: string) =>
      updateTasks(new Set([todoId]), (t) =>
        t.subtasks
          ? { ...t, subtasks: t.subtasks.map((st) => (st.id === subtaskId ? { ...st, completed: !st.completed } : st)) }
          : t
      ),
    [updateTasks]
  );

  const togglePinTodo = useCallback(
    async (id: string) => updateTasks(new Set([id]), (t) => ({ ...t, pinned: !t.pinned })),
    [updateTasks]
  );

  const togglePinBatch = useCallback(
    async (ids: string[]) => {
      const idSet = new Set(ids);
      const allPinned = todosRef.current.filter((t) => idSet.has(t.id)).every((t) => t.pinned);
      updateTasks(idSet, (t) => ({ ...t, pinned: !allPinned }));
    },
    [updateTasks]
  );

  const moveBatchToDate = useCallback(
    async (ids: string[], newDate: string) => updateTasks(new Set(ids), (t) => ({ ...t, date: newDate })),
    [updateTasks]
  );

  const moveToDate = useCallback(
    (id: string, newDate: string) => moveBatchToDate([id], newDate),
    [moveBatchToDate]
  );

  const toggleBatchComplete = useCallback(
    async (ids: string[], completed: boolean) => updateTasks(new Set(ids), (t) => ({ ...t, completed })),
    [updateTasks]
  );

  const duplicateTodo = useCallback(
    async (id: string, targetDate: string) => {
      const original = todosRef.current.find((t) => t.id === id);
      if (!original) return;
      addTasks([
        {
          ...fromBin(original),
          id: newId('_dup'),
          completed: false,
          createdAt: Date.now(),
          date: targetDate,
          subtasks: original.subtasks?.map((st, idx) => ({ ...st, id: newId(`_${idx}`), completed: false })),
        },
      ]);
    },
    [addTasks]
  );

  const editTodo = useCallback(
    async (params: EditTodoParams) => {
      const trimmed = params.text.trim();
      if (!trimmed) return;
      updateTasks(new Set([params.id]), (t) => ({
        ...t,
        text: trimmed,
        priority: 'priority' in params ? (params.priority && params.priority !== 'none' ? params.priority : undefined) : t.priority,
        tag: 'tag' in params ? params.tag : t.tag,
        subtasks: 'subtasks' in params ? params.subtasks : t.subtasks,
        notes: 'notes' in params ? params.notes : t.notes,
      }));
    },
    [updateTasks]
  );

  const deleteBatchTodos = useCallback(
    async (ids: string[]) => {
      const idSet = new Set(ids);
      const now = Date.now();
      const removed = todosRef.current.filter((t) => idSet.has(t.id)).map((t) => ({ ...t, deletedAt: now }));
      if (removed.length === 0) return;
      const removedIds = new Set(removed.map((t) => t.id));
      commitBin([...removed, ...binRef.current.filter((t) => !removedIds.has(t.id))]);
      commitTodos(todosRef.current.filter((t) => !removedIds.has(t.id)));
      markChanged([], [...removedIds]);
      setLastDeletedTodos(removed);
      setIsUndoVisible(true);
    },
    [commitBin, commitTodos, markChanged]
  );

  const deleteTodo = useCallback((id: string) => deleteBatchTodos([id]), [deleteBatchTodos]);

  /** Hides the Undo bar if it refers to any of these tasks. */
  const forgetUndoFor = useCallback(
    (ids: Set<string>) => {
      if (!lastDeletedTodos.some((t) => ids.has(t.id))) return;
      setIsUndoVisible(false);
      setLastDeletedTodos([]);
    },
    [lastDeletedTodos]
  );

  const restoreBatchFromBin = useCallback(
    async (ids: string[]) => {
      const idSet = new Set(ids);
      const restored = binRef.current.filter((t) => idSet.has(t.id)).map(fromBin);
      if (restored.length === 0) return;
      const restoredIds = new Set(restored.map((t) => t.id));
      commitBin(binRef.current.filter((t) => !restoredIds.has(t.id)));
      commitTodos([...restored, ...todosRef.current.filter((t) => !restoredIds.has(t.id))]);
      markChanged([...restoredIds]);
      forgetUndoFor(restoredIds);
    },
    [commitBin, commitTodos, markChanged, forgetUndoFor]
  );

  const restoreFromBin = useCallback((id: string) => restoreBatchFromBin([id]), [restoreBatchFromBin]);

  const deletePermanentlyBatch = useCallback(
    async (ids: string[]) => {
      const idSet = new Set(ids);
      commitBin(binRef.current.filter((t) => !idSet.has(t.id)));
      forgetUndoFor(idSet);
    },
    [commitBin, forgetUndoFor]
  );

  const deletePermanently = useCallback((id: string) => deletePermanentlyBatch([id]), [deletePermanentlyBatch]);

  const emptyBin = useCallback(async () => {
    commitBin([]);
    setIsUndoVisible(false);
    setLastDeletedTodos([]);
  }, [commitBin]);

  const importBackupData = useCallback(
    async (newTodos: TodoItem[], newBin: TodoItem[]) => {
      const newIds = new Set(newTodos.map((t) => t.id));
      const removedIds = todosRef.current.filter((t) => !newIds.has(t.id)).map((t) => t.id);
      commitTodos(newTodos);
      commitBin(newBin);
      setIsUndoVisible(false);
      setLastDeletedTodos([]);
      // The backup replaces the cloud copy too.
      markChanged([...newIds], removedIds);
    },
    [commitTodos, commitBin, markChanged]
  );

  const undoMessage = useMemo(() => {
    if (lastDeletedTodos.length > 1) return `${lastDeletedTodos.length} tasks moved to bin`;
    const title = lastDeletedTodos[0]?.text?.trim();
    if (!title) return 'Moved to bin';
    return title.length > 20 ? `"${title.substring(0, 20)}..." moved to bin` : `"${title}" moved to bin`;
  }, [lastDeletedTodos]);

  const undoDelete = useCallback(async () => {
    const ids = lastDeletedTodos.map((t) => t.id);
    setIsUndoVisible(false);
    setLastDeletedTodos([]);
    await restoreBatchFromBin(ids);
  }, [lastDeletedTodos, restoreBatchFromBin]);

  const dismissUndo = useCallback(() => {
    setIsUndoVisible(false);
    setLastDeletedTodos([]);
  }, []);

  const getPastPendingTasks = useCallback(
    (): TodoItem[] => todos.filter((item) => !item.completed && item.date < today),
    [todos, today]
  );

  const rolloverPastTasks = useCallback(async () => {
    const now = getTodayKey();
    const ids = new Set(todosRef.current.filter((t) => !t.completed && t.date < now).map((t) => t.id));
    updateTasks(ids, (t) => ({ ...t, date: now }));
  }, [updateTasks]);

  const getTodosForDate = useCallback(
    (date?: string): TodoItem[] => {
      const targetDate = date || selectedDate;
      // Pinned first, then unfinished, then newest.
      return todos
        .filter((item) => item.date === targetDate)
        .sort((a, b) => {
          if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
          if (a.completed !== b.completed) return a.completed ? 1 : -1;
          return b.createdAt - a.createdAt;
        });
    },
    [todos, selectedDate]
  );

  const value = useMemo(
    () => ({
      todos,
      binTodos,
      isLoading,
      today,
      selectedDate,
      setSelectedDate,
      getTodosForDate,
      getPastPendingTasks,
      rolloverPastTasks,
      addTodo,
      addBatchTodos,
      toggleTodo,
      toggleSubtask,
      togglePinTodo,
      togglePinBatch,
      moveToDate,
      duplicateTodo,
      editTodo,
      deleteTodo,
      deleteBatchTodos,
      toggleBatchComplete,
      moveBatchToDate,
      undoDelete,
      restoreFromBin,
      restoreBatchFromBin,
      deletePermanently,
      deletePermanentlyBatch,
      emptyBin,
      importBackupData,
      undoMessage,
      isUndoVisible,
      dismissUndo,
    }),
    [
      todos,
      binTodos,
      isLoading,
      today,
      selectedDate,
      getTodosForDate,
      getPastPendingTasks,
      rolloverPastTasks,
      addTodo,
      addBatchTodos,
      toggleTodo,
      toggleSubtask,
      togglePinTodo,
      togglePinBatch,
      moveToDate,
      duplicateTodo,
      editTodo,
      deleteTodo,
      deleteBatchTodos,
      toggleBatchComplete,
      moveBatchToDate,
      undoDelete,
      restoreFromBin,
      restoreBatchFromBin,
      deletePermanently,
      deletePermanentlyBatch,
      emptyBin,
      importBackupData,
      undoMessage,
      isUndoVisible,
      dismissUndo,
    ]
  );

  return <TodoContext.Provider value={value}>{children}</TodoContext.Provider>;
};

export function useTodos() {
  const context = useContext(TodoContext);
  if (!context) {
    throw new Error('useTodos must be used within a TodoProvider');
  }
  return context;
}
