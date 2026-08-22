import React, { createContext, useContext, useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { SectionKey, TodoItem, StatusFilter, RoutineTemplate, SubtaskItem, RecurrenceType } from '@/types/todo';
import {
  loadTodosFromStorage,
  saveTodosToStorage,
  loadBinFromStorage,
  saveBinToStorage,
} from '@/storage/todo-storage';
import { getTodayKey } from '@/utils/date';
import { calculateCompletionStreak } from '@/utils/streak';
import { calculateNextRecurrenceDate } from '@/utils/recurrence';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/auth-context';

interface AddTodoParams {
  section: SectionKey;
  text: string;
  date?: string;
  tag?: string;
  recurrence?: RecurrenceType;
  subtasks?: SubtaskItem[];
  notes?: string;
}

interface EditTodoParams {
  id: string;
  text: string;
  tag?: string;
  recurrence?: RecurrenceType;
  subtasks?: SubtaskItem[];
  notes?: string;
}

interface TodoContextType {
  todos: TodoItem[];
  binTodos: TodoItem[];
  isLoading: boolean;
  isSyncing: boolean;
  selectedDate: string;
  setSelectedDate: (date: string) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  statusFilter: StatusFilter;
  setStatusFilter: (f: StatusFilter) => void;
  streak: number;
  getSectionTodos: (section: SectionKey, date?: string) => TodoItem[];
  getPastPendingTasks: (section: SectionKey) => TodoItem[];
  rolloverPastTasks: (section: SectionKey) => Promise<void>;
  addTodo: (params: AddTodoParams | (SectionKey | string)[]) => Promise<void>;
  addBatchTodos: (section: SectionKey, texts: string[], date?: string, tag?: string) => Promise<void>;
  applyRoutine: (routine: RoutineTemplate, date?: string) => Promise<void>;
  toggleTodo: (id: string) => Promise<void>;
  toggleSubtask: (todoId: string, subtaskId: string) => Promise<void>;
  togglePinTodo: (id: string) => Promise<void>;
  moveToDate: (id: string, newDate: string) => Promise<void>;
  moveToSection: (id: string, newSection: SectionKey) => Promise<void>;
  duplicateTodo: (id: string, targetDate: string, targetSection?: SectionKey) => Promise<void>;
  editTodo: (params: EditTodoParams | (string | undefined)[]) => Promise<void>;
  deleteTodo: (id: string) => Promise<void>;
  deleteBatchTodos: (ids: string[]) => Promise<void>;
  toggleBatchComplete: (ids: string[], completed: boolean) => Promise<void>;
  moveBatchToDate: (ids: string[], newDate: string) => Promise<void>;
  moveBatchToSection: (ids: string[], newSection: SectionKey) => Promise<void>;
  undoDelete: () => Promise<void>;
  restoreFromBin: (id: string) => Promise<void>;
  restoreBatchFromBin: (ids: string[]) => Promise<void>;
  deletePermanently: (id: string) => Promise<void>;
  deletePermanentlyBatch: (ids: string[]) => Promise<void>;
  emptyBin: () => Promise<void>;
  importBackupData: (newTodos: TodoItem[], newBin: TodoItem[]) => Promise<void>;
  lastDeletedTodo: TodoItem | null;
  isUndoVisible: boolean;
  dismissUndo: () => void;
  reloadTodos: () => Promise<void>;
}

const TodoContext = createContext<TodoContextType | undefined>(undefined);

// Helper to convert TodoItem to Supabase DB Row
function todoToDbRow(item: TodoItem, userId: string) {
  return {
    id: item.id,
    user_id: userId,
    text: item.text,
    completed: item.completed,
    section: item.section,
    date: item.date,
    pinned: item.pinned ?? false,
    tag: item.tag ?? null,
    recurrence: item.recurrence ?? null,
    subtasks: item.subtasks ? JSON.stringify(item.subtasks) : '[]',
    notes: item.notes ?? null,
    created_at: item.createdAt,
  };
}

// Helper to convert DB Row to TodoItem
function dbRowToTodo(row: any): TodoItem {
  let parsedSubtasks: SubtaskItem[] | undefined;
  if (row.subtasks) {
    try {
      parsedSubtasks = typeof row.subtasks === 'string' ? JSON.parse(row.subtasks) : row.subtasks;
    } catch {
      parsedSubtasks = undefined;
    }
  }

  return {
    id: row.id,
    text: row.text,
    completed: Boolean(row.completed),
    createdAt: Number(row.created_at) || Date.now(),
    section: row.section,
    date: row.date,
    pinned: Boolean(row.pinned),
    tag: row.tag || undefined,
    recurrence: row.recurrence || undefined,
    subtasks: parsedSubtasks && parsedSubtasks.length > 0 ? parsedSubtasks : undefined,
    notes: row.notes || undefined,
  };
}

export const TodoProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isGuest } = useAuth();

  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [binTodos, setBinTodos] = useState<TodoItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [selectedDate, setSelectedDate] = useState<string>(getTodayKey());
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [lastDeletedTodo, setLastDeletedTodo] = useState<TodoItem | null>(null);
  const [isUndoVisible, setIsUndoVisible] = useState<boolean>(false);

  const isRealtimeEventRef = useRef(false);
  const activeUserIdRef = useRef<string | null>(null);
  const deletedIdsRef = useRef<Set<string>>(new Set());

  // Sync with user state changes / guest mode
  useEffect(() => {
    let isMounted = true;
    activeUserIdRef.current = user?.id ?? null;

    // 1. Unauthenticated and not in guest mode: clear all private data
    if (!user && !isGuest) {
      setTodos([]);
      setBinTodos([]);
      setIsLoading(false);
      setIsSyncing(false);
      return;
    }

    // 2. Guest mode: load isolated guest storage
    if (!user && isGuest) {
      setIsLoading(true);
      (async () => {
        try {
          const [guestTodos, guestBin] = await Promise.all([
            loadTodosFromStorage(null),
            loadBinFromStorage(null),
          ]);
          if (isMounted) {
            setTodos(guestTodos);
            setBinTodos(guestBin);
            setIsLoading(false);
          }
        } catch (e) {
          console.error('Error loading guest todos', e);
          if (isMounted) setIsLoading(false);
        }
      })();
      return;
    }

    // 3. Authenticated User: Load user-scoped local cache & sync with Supabase
    if (user) {
      setIsLoading(true);
      setIsSyncing(true);

      (async () => {
        try {
          // First load user cache for immediate render
          const [cachedUserTodos, cachedUserBin] = await Promise.all([
            loadTodosFromStorage(user.id),
            loadBinFromStorage(user.id),
          ]);

          if (isMounted && activeUserIdRef.current === user.id) {
            setTodos(cachedUserTodos);
            setBinTodos(cachedUserBin);
            setIsLoading(false);
          }

          // Then fetch from Supabase table
          const { data: remoteTodos, error } = await supabase
            .from('todos')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });

          if (!error && remoteTodos && isMounted && activeUserIdRef.current === user.id) {
            const mappedTodos = remoteTodos
              .map(dbRowToTodo)
              .filter((t) => !deletedIdsRef.current.has(t.id));
            setTodos(mappedTodos);
            await saveTodosToStorage(mappedTodos, user.id);
          }
        } catch (e) {
          console.error('Error syncing user todos with Supabase', e);
        } finally {
          if (isMounted) {
            setIsLoading(false);
            setIsSyncing(false);
          }
        }
      })();

      // Realtime subscription for this user
      const channel = supabase
        .channel(`public:todos:${user.id}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'todos', filter: `user_id=eq.${user.id}` },
          (payload) => {
            if (isRealtimeEventRef.current) return;

            if (payload.eventType === 'INSERT') {
              const newTodo = dbRowToTodo(payload.new);
              if (deletedIdsRef.current.has(newTodo.id)) return;

              setTodos((prev) => {
                if (prev.some((t) => t.id === newTodo.id)) return prev;
                const updated = [newTodo, ...prev];
                saveTodosToStorage(updated, user.id);
                return updated;
              });
            } else if (payload.eventType === 'UPDATE') {
              const updatedTodo = dbRowToTodo(payload.new);
              if (deletedIdsRef.current.has(updatedTodo.id)) return;

              setTodos((prev) => {
                const updated = prev.map((t) => (t.id === updatedTodo.id ? updatedTodo : t));
                saveTodosToStorage(updated, user.id);
                return updated;
              });
            } else if (payload.eventType === 'DELETE') {
              const deletedId = (payload.old as any)?.id;
              if (deletedId) {
                deletedIdsRef.current.add(deletedId);
                setTodos((prev) => {
                  const updated = prev.filter((t) => t.id !== deletedId);
                  saveTodosToStorage(updated, user.id);
                  return updated;
                });
              }
            }
          }
        )
        .subscribe();

      return () => {
        isMounted = false;
        supabase.removeChannel(channel);
      };
    }
  }, [user, isGuest]);

  // Helper to save locally based on current user / guest status
  const updateTodosAndSave = useCallback(
    async (newTodos: TodoItem[]) => {
      setTodos(newTodos);
      await saveTodosToStorage(newTodos, user?.id ?? null);
    },
    [user]
  );

  const pushTodoToCloud = useCallback(
    async (item: TodoItem) => {
      if (!user) return;
      try {
        isRealtimeEventRef.current = true;
        await supabase.from('todos').upsert(todoToDbRow(item, user.id));
      } catch (e) {
        console.error('Failed to push todo to Supabase', e);
      } finally {
        setTimeout(() => {
          isRealtimeEventRef.current = false;
        }, 300);
      }
    },
    [user]
  );

  const pushBatchToCloud = useCallback(
    async (items: TodoItem[]) => {
      if (!user || items.length === 0) return;
      try {
        isRealtimeEventRef.current = true;
        const rows = items.map((it) => todoToDbRow(it, user.id));
        await supabase.from('todos').upsert(rows);
      } catch (e) {
        console.error('Failed to push batch to Supabase', e);
      } finally {
        setTimeout(() => {
          isRealtimeEventRef.current = false;
        }, 300);
      }
    },
    [user]
  );

  const deleteTodoFromCloud = useCallback(
    async (id: string) => {
      if (!user) return;
      try {
        isRealtimeEventRef.current = true;
        await supabase.from('todos').delete().eq('id', id);
      } catch (e) {
        console.error('Failed to delete todo from Supabase', e);
      } finally {
        setTimeout(() => {
          isRealtimeEventRef.current = false;
        }, 300);
      }
    },
    [user]
  );

  const deleteBatchFromCloud = useCallback(
    async (ids: string[]) => {
      if (!user || ids.length === 0) return;
      try {
        isRealtimeEventRef.current = true;
        await supabase.from('todos').delete().in('id', ids);
      } catch (e) {
        console.error('Failed to delete batch from Supabase', e);
      } finally {
        setTimeout(() => {
          isRealtimeEventRef.current = false;
        }, 300);
      }
    },
    [user]
  );

  const addTodo = useCallback(
    async (args: any, textArg?: string, dateArg?: string, tagArg?: string) => {
      let section: SectionKey;
      let text: string;
      let date: string | undefined;
      let tag: string | undefined;
      let recurrence: RecurrenceType | undefined;
      let subtasks: SubtaskItem[] | undefined;
      let notes: string | undefined;

      if (typeof args === 'object' && args !== null && 'section' in args) {
        section = args.section;
        text = args.text;
        date = args.date;
        tag = args.tag;
        recurrence = args.recurrence;
        subtasks = args.subtasks;
        notes = args.notes;
      } else {
        section = args as SectionKey;
        text = textArg || '';
        date = dateArg;
        tag = tagArg;
      }

      const trimmed = text.trim();
      if (!trimmed) return;

      const targetDate = date || selectedDate || getTodayKey();

      const newTodo: TodoItem = {
        id: `${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
        text: trimmed,
        completed: false,
        createdAt: Date.now(),
        section,
        date: targetDate,
        pinned: false,
        tag: tag || undefined,
        recurrence: recurrence && recurrence !== 'none' ? recurrence : undefined,
        subtasks: subtasks && subtasks.length > 0 ? subtasks : undefined,
        notes: notes?.trim() || undefined,
      };

      deletedIdsRef.current.delete(newTodo.id);
      setTodos((prev) => {
        const updated = [newTodo, ...prev];
        saveTodosToStorage(updated, user?.id ?? null);
        return updated;
      });
      pushTodoToCloud(newTodo);
    },
    [selectedDate, user, pushTodoToCloud]
  );

  const addBatchTodos = useCallback(
    async (section: SectionKey, texts: string[], date?: string, tag?: string) => {
      const validLines = texts.map((t) => t.trim()).filter((t) => t.length > 0);
      if (validLines.length === 0) return;

      const targetDate = date || selectedDate || getTodayKey();
      const baseTime = Date.now();

      const newItems: TodoItem[] = validLines.map((line, idx) => ({
        id: `${baseTime}_${idx}_${Math.random().toString(36).substring(2, 7)}`,
        text: line,
        completed: false,
        createdAt: baseTime + idx,
        section,
        date: targetDate,
        pinned: false,
        tag: tag || undefined,
      }));

      newItems.forEach((it) => deletedIdsRef.current.delete(it.id));
      setTodos((prev) => {
        const updated = [...newItems, ...prev];
        saveTodosToStorage(updated, user?.id ?? null);
        return updated;
      });
      pushBatchToCloud(newItems);
    },
    [selectedDate, user, pushBatchToCloud]
  );

  const applyRoutine = useCallback(
    async (routine: RoutineTemplate, date?: string) => {
      const targetDate = date || selectedDate || getTodayKey();
      const baseTime = Date.now();

      const newItems: TodoItem[] = routine.tasks.map((taskText, idx) => ({
        id: `${baseTime}_routine_${idx}_${Math.random().toString(36).substring(2, 7)}`,
        text: taskText,
        completed: false,
        createdAt: baseTime + idx,
        section: routine.section,
        date: targetDate,
        pinned: false,
      }));

      newItems.forEach((it) => deletedIdsRef.current.delete(it.id));
      setTodos((prev) => {
        const updated = [...newItems, ...prev];
        saveTodosToStorage(updated, user?.id ?? null);
        return updated;
      });
      pushBatchToCloud(newItems);
    },
    [selectedDate, user, pushBatchToCloud]
  );

  const toggleTodo = useCallback(
    async (id: string) => {
      let modifiedTarget: TodoItem | null = null;
      let nextRecurringItem: TodoItem | null = null;

      setTodos((prev) => {
        const target = prev.find((item) => item.id === id);
        if (!target) return prev;

        const willBeCompleted = !target.completed;
        if (willBeCompleted && target.recurrence && target.recurrence !== 'none') {
          const nextDate = calculateNextRecurrenceDate(target.date, target.recurrence);
          if (nextDate) {
            const alreadyExists = prev.some(
              (t) =>
                t.text === target.text &&
                t.section === target.section &&
                t.date === nextDate
            );
            if (!alreadyExists) {
              nextRecurringItem = {
                id: `${Date.now()}_rec_${Math.random().toString(36).substring(2, 7)}`,
                text: target.text,
                completed: false,
                createdAt: Date.now(),
                section: target.section,
                date: nextDate,
                pinned: target.pinned,
                tag: target.tag,
                recurrence: target.recurrence,
                subtasks: target.subtasks
                  ? target.subtasks.map((st) => ({ ...st, completed: false }))
                  : undefined,
                notes: target.notes,
              };
            }
          }
        }

        modifiedTarget = { ...target, completed: willBeCompleted };
        const updated = prev.map((item) => (item.id === id ? modifiedTarget! : item));
        const finalList = nextRecurringItem ? [nextRecurringItem, ...updated] : updated;
        saveTodosToStorage(finalList, user?.id ?? null);
        return finalList;
      });

      if (modifiedTarget) {
        pushTodoToCloud(modifiedTarget);
      }
      if (nextRecurringItem) {
        pushTodoToCloud(nextRecurringItem);
      }
    },
    [user, pushTodoToCloud]
  );

  const toggleSubtask = useCallback(
    async (todoId: string, subtaskId: string) => {
      let modifiedItem: TodoItem | null = null;

      setTodos((prev) => {
        const updated = prev.map((item) => {
          if (item.id === todoId && item.subtasks) {
            const updatedSubtasks = item.subtasks.map((st) =>
              st.id === subtaskId ? { ...st, completed: !st.completed } : st
            );
            modifiedItem = { ...item, subtasks: updatedSubtasks };
            return modifiedItem;
          }
          return item;
        });
        saveTodosToStorage(updated, user?.id ?? null);
        return updated;
      });

      if (modifiedItem) {
        pushTodoToCloud(modifiedItem);
      }
    },
    [user, pushTodoToCloud]
  );

  const togglePinTodo = useCallback(
    async (id: string) => {
      let modifiedItem: TodoItem | null = null;

      setTodos((prev) => {
        const updated = prev.map((item) => {
          if (item.id === id) {
            modifiedItem = { ...item, pinned: !item.pinned };
            return modifiedItem;
          }
          return item;
        });
        saveTodosToStorage(updated, user?.id ?? null);
        return updated;
      });

      if (modifiedItem) {
        pushTodoToCloud(modifiedItem);
      }
    },
    [user, pushTodoToCloud]
  );

  const moveToDate = useCallback(
    async (id: string, newDate: string) => {
      let modifiedItem: TodoItem | null = null;

      setTodos((prev) => {
        const updated = prev.map((item) => {
          if (item.id === id) {
            modifiedItem = { ...item, date: newDate };
            return modifiedItem;
          }
          return item;
        });
        saveTodosToStorage(updated, user?.id ?? null);
        return updated;
      });

      if (modifiedItem) {
        pushTodoToCloud(modifiedItem);
      }
    },
    [user, pushTodoToCloud]
  );

  const moveToSection = useCallback(
    async (id: string, newSection: SectionKey) => {
      let modifiedItem: TodoItem | null = null;

      setTodos((prev) => {
        const updated = prev.map((item) => {
          if (item.id === id) {
            modifiedItem = { ...item, section: newSection };
            return modifiedItem;
          }
          return item;
        });
        saveTodosToStorage(updated, user?.id ?? null);
        return updated;
      });

      if (modifiedItem) {
        pushTodoToCloud(modifiedItem);
      }
    },
    [user, pushTodoToCloud]
  );

  const duplicateTodo = useCallback(
    async (id: string, targetDate: string, targetSection?: SectionKey) => {
      let clone: TodoItem | null = null;

      setTodos((prev) => {
        const original = prev.find((t) => t.id === id);
        if (!original) return prev;

        clone = {
          id: `${Date.now()}_dup_${Math.random().toString(36).substring(2, 7)}`,
          text: original.text,
          completed: false,
          createdAt: Date.now(),
          section: targetSection || original.section,
          date: targetDate,
          pinned: original.pinned,
          tag: original.tag,
          recurrence: original.recurrence,
          subtasks: original.subtasks
            ? original.subtasks.map((st) => ({
                ...st,
                id: `${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
                completed: false,
              }))
            : undefined,
          notes: original.notes,
        };

        deletedIdsRef.current.delete(clone.id);
        const updated = [clone, ...prev];
        saveTodosToStorage(updated, user?.id ?? null);
        return updated;
      });

      if (clone) {
        pushTodoToCloud(clone);
      }
    },
    [user, pushTodoToCloud]
  );

  const editTodo = useCallback(
    async (args: any, textArg?: string, tagArg?: string) => {
      let id: string;
      let text: string;
      let tag: string | undefined;
      let recurrence: RecurrenceType | undefined;
      let subtasks: SubtaskItem[] | undefined;
      let notes: string | undefined;
      let hasSubtasksInArgs = false;
      let hasNotesInArgs = false;
      let hasRecurrenceInArgs = false;
      let hasTagInArgs = false;

      if (typeof args === 'object' && args !== null && 'id' in args) {
        id = args.id;
        text = args.text;
        tag = args.tag;
        recurrence = args.recurrence;
        subtasks = args.subtasks;
        notes = args.notes;
        hasSubtasksInArgs = 'subtasks' in args;
        hasNotesInArgs = 'notes' in args;
        hasRecurrenceInArgs = 'recurrence' in args;
        hasTagInArgs = 'tag' in args;
      } else {
        id = args as string;
        text = textArg || '';
        tag = tagArg;
      }

      const trimmed = text.trim();
      if (!trimmed) return;

      let modifiedItem: TodoItem | null = null;

      setTodos((prev) => {
        const updated = prev.map((item) => {
          if (item.id === id) {
            modifiedItem = {
              ...item,
              text: trimmed,
              tag: hasTagInArgs ? tag : item.tag,
              recurrence: hasRecurrenceInArgs ? recurrence : item.recurrence,
              subtasks: hasSubtasksInArgs ? subtasks : item.subtasks,
              notes: hasNotesInArgs ? notes : item.notes,
            };
            return modifiedItem;
          }
          return item;
        });
        saveTodosToStorage(updated, user?.id ?? null);
        return updated;
      });

      if (modifiedItem) {
        pushTodoToCloud(modifiedItem);
      }
    },
    [user, pushTodoToCloud]
  );

  const deleteTodo = useCallback(
    async (id: string) => {
      deletedIdsRef.current.add(id);

      setTodos((prev) => {
        const found = prev.find((item) => item.id === id);
        if (found) {
          const deletedItem: TodoItem = {
            ...found,
            deletedAt: Date.now(),
          };
          setLastDeletedTodo(deletedItem);
          setIsUndoVisible(true);

          setBinTodos((prevBin) => {
            const updatedBin = [deletedItem, ...prevBin];
            saveBinToStorage(updatedBin, user?.id ?? null);
            return updatedBin;
          });
        }

        const updatedTodos = prev.filter((item) => item.id !== id);
        saveTodosToStorage(updatedTodos, user?.id ?? null);
        return updatedTodos;
      });

      deleteTodoFromCloud(id);
    },
    [user, deleteTodoFromCloud]
  );

  const deleteBatchTodos = useCallback(
    async (ids: string[]) => {
      if (ids.length === 0) return;
      const idsSet = new Set(ids);
      ids.forEach((id) => deletedIdsRef.current.add(id));

      setTodos((prev) => {
        const itemsToDelete = prev.filter((item) => idsSet.has(item.id));
        if (itemsToDelete.length > 0) {
          const deletedItems: TodoItem[] = itemsToDelete.map((it) => ({
            ...it,
            deletedAt: Date.now(),
          }));

          setLastDeletedTodo(deletedItems[0] || null);
          setIsUndoVisible(true);

          setBinTodos((prevBin) => {
            const updatedBin = [...deletedItems, ...prevBin];
            saveBinToStorage(updatedBin, user?.id ?? null);
            return updatedBin;
          });
        }

        const updatedTodos = prev.filter((item) => !idsSet.has(item.id));
        saveTodosToStorage(updatedTodos, user?.id ?? null);
        return updatedTodos;
      });

      deleteBatchFromCloud(ids);
    },
    [user, deleteBatchFromCloud]
  );

  const toggleBatchComplete = useCallback(
    async (ids: string[], completed: boolean) => {
      const idsSet = new Set(ids);
      const modifiedItems: TodoItem[] = [];

      setTodos((prev) => {
        const updated = prev.map((item) => {
          if (idsSet.has(item.id)) {
            const mod = { ...item, completed };
            modifiedItems.push(mod);
            return mod;
          }
          return item;
        });
        saveTodosToStorage(updated, user?.id ?? null);
        return updated;
      });

      if (modifiedItems.length > 0) {
        pushBatchToCloud(modifiedItems);
      }
    },
    [user, pushBatchToCloud]
  );

  const moveBatchToDate = useCallback(
    async (ids: string[], newDate: string) => {
      const idsSet = new Set(ids);
      const modifiedItems: TodoItem[] = [];

      setTodos((prev) => {
        const updated = prev.map((item) => {
          if (idsSet.has(item.id)) {
            const mod = { ...item, date: newDate };
            modifiedItems.push(mod);
            return mod;
          }
          return item;
        });
        saveTodosToStorage(updated, user?.id ?? null);
        return updated;
      });

      if (modifiedItems.length > 0) {
        pushBatchToCloud(modifiedItems);
      }
    },
    [user, pushBatchToCloud]
  );

  const moveBatchToSection = useCallback(
    async (ids: string[], newSection: SectionKey) => {
      const idsSet = new Set(ids);
      const modifiedItems: TodoItem[] = [];

      setTodos((prev) => {
        const updated = prev.map((item) => {
          if (idsSet.has(item.id)) {
            const mod = { ...item, section: newSection };
            modifiedItems.push(mod);
            return mod;
          }
          return item;
        });
        saveTodosToStorage(updated, user?.id ?? null);
        return updated;
      });

      if (modifiedItems.length > 0) {
        pushBatchToCloud(modifiedItems);
      }
    },
    [user, pushBatchToCloud]
  );

  const restoreFromBin = useCallback(
    async (id: string) => {
      deletedIdsRef.current.delete(id);
      let cleanedItem: TodoItem | null = null;

      setBinTodos((prevBin) => {
        const itemToRestore = prevBin.find((item) => item.id === id);
        if (itemToRestore) {
          cleanedItem = {
            id: itemToRestore.id,
            text: itemToRestore.text,
            completed: itemToRestore.completed,
            createdAt: itemToRestore.createdAt,
            section: itemToRestore.section,
            date: itemToRestore.date,
            pinned: itemToRestore.pinned,
            tag: itemToRestore.tag,
            recurrence: itemToRestore.recurrence,
            subtasks: itemToRestore.subtasks,
            notes: itemToRestore.notes,
          };
        }
        const updatedBin = prevBin.filter((item) => item.id !== id);
        saveBinToStorage(updatedBin, user?.id ?? null);
        return updatedBin;
      });

      if (cleanedItem) {
        const itemToRestore = cleanedItem;
        setTodos((prevTodos) => {
          const updatedTodos = [itemToRestore, ...prevTodos];
          saveTodosToStorage(updatedTodos, user?.id ?? null);
          return updatedTodos;
        });
        pushTodoToCloud(itemToRestore);
      }

      if (lastDeletedTodo?.id === id) {
        setIsUndoVisible(false);
        setLastDeletedTodo(null);
      }
    },
    [lastDeletedTodo, user, pushTodoToCloud]
  );

  const restoreBatchFromBin = useCallback(
    async (ids: string[]) => {
      if (ids.length === 0) return;
      const idsSet = new Set(ids);
      ids.forEach((id) => deletedIdsRef.current.delete(id));
      const restoredItems: TodoItem[] = [];

      setBinTodos((prevBin) => {
        const itemsToRestore = prevBin.filter((item) => idsSet.has(item.id));
        itemsToRestore.forEach((item) => {
          restoredItems.push({
            id: item.id,
            text: item.text,
            completed: item.completed,
            createdAt: item.createdAt,
            section: item.section,
            date: item.date,
            pinned: item.pinned,
            tag: item.tag,
            recurrence: item.recurrence,
            subtasks: item.subtasks,
            notes: item.notes,
          });
        });
        const updatedBin = prevBin.filter((item) => !idsSet.has(item.id));
        saveBinToStorage(updatedBin, user?.id ?? null);
        return updatedBin;
      });

      if (restoredItems.length > 0) {
        setTodos((prevTodos) => {
          const updatedTodos = [...restoredItems, ...prevTodos];
          saveTodosToStorage(updatedTodos, user?.id ?? null);
          return updatedTodos;
        });
        pushBatchToCloud(restoredItems);
      }

      if (lastDeletedTodo && idsSet.has(lastDeletedTodo.id)) {
        setIsUndoVisible(false);
        setLastDeletedTodo(null);
      }
    },
    [lastDeletedTodo, user, pushBatchToCloud]
  );

  const deletePermanently = useCallback(
    async (id: string) => {
      const updatedBin = binTodos.filter((item) => item.id !== id);
      setBinTodos(updatedBin);
      if (lastDeletedTodo?.id === id) {
        setIsUndoVisible(false);
        setLastDeletedTodo(null);
      }
      await saveBinToStorage(updatedBin, user?.id ?? null);
    },
    [binTodos, lastDeletedTodo, user]
  );

  const deletePermanentlyBatch = useCallback(
    async (ids: string[]) => {
      if (ids.length === 0) return;
      const idsSet = new Set(ids);
      setBinTodos((prevBin) => {
        const updatedBin = prevBin.filter((item) => !idsSet.has(item.id));
        saveBinToStorage(updatedBin, user?.id ?? null);
        return updatedBin;
      });
      if (lastDeletedTodo && idsSet.has(lastDeletedTodo.id)) {
        setIsUndoVisible(false);
        setLastDeletedTodo(null);
      }
    },
    [lastDeletedTodo, user]
  );

  const emptyBin = useCallback(async () => {
    setBinTodos([]);
    setIsUndoVisible(false);
    setLastDeletedTodo(null);
    await saveBinToStorage([], user?.id ?? null);
  }, [user]);

  const importBackupData = useCallback(
    async (newTodos: TodoItem[], newBin: TodoItem[]) => {
      setTodos(newTodos);
      setBinTodos(newBin);
      setIsUndoVisible(false);
      setLastDeletedTodo(null);
      const userId = user?.id ?? null;
      await Promise.all([
        saveTodosToStorage(newTodos, userId),
        saveBinToStorage(newBin, userId),
      ]);
      if (user) {
        pushBatchToCloud(newTodos);
      }
    },
    [user, pushBatchToCloud]
  );

  const undoDelete = useCallback(async () => {
    if (!lastDeletedTodo) return;
    await restoreFromBin(lastDeletedTodo.id);
  }, [lastDeletedTodo, restoreFromBin]);

  const dismissUndo = useCallback(() => {
    setIsUndoVisible(false);
  }, []);

  const getPastPendingTasks = useCallback(
    (section: SectionKey): TodoItem[] => {
      const today = getTodayKey();
      return todos.filter(
        (item) =>
          item.section === section &&
          !item.completed &&
          item.date < today
      );
    },
    [todos]
  );

  const rolloverPastTasks = useCallback(
    async (section: SectionKey) => {
      const today = getTodayKey();
      const modifiedItems: TodoItem[] = [];

      setTodos((prev) => {
        const updated = prev.map((item) => {
          if (item.section === section && !item.completed && item.date < today) {
            const mod = { ...item, date: today };
            modifiedItems.push(mod);
            return mod;
          }
          return item;
        });
        saveTodosToStorage(updated, user?.id ?? null);
        return updated;
      });

      if (modifiedItems.length > 0) {
        pushBatchToCloud(modifiedItems);
      }
    },
    [user, pushBatchToCloud]
  );

  const getSectionTodos = useCallback(
    (section: SectionKey, date?: string): TodoItem[] => {
      const targetDate = date || selectedDate;
      let filtered = todos.filter(
        (item) => item.section === section && item.date === targetDate
      );

      // Search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        filtered = filtered.filter((item) =>
          item.text.toLowerCase().includes(query)
        );
      }

      // Status filter
      if (statusFilter === 'pending') {
        filtered = filtered.filter((item) => !item.completed);
      } else if (statusFilter === 'completed') {
        filtered = filtered.filter((item) => item.completed);
      }

      // Sorting: Pinned first, then pending first, then newest
      return filtered.sort((a, b) => {
        if (a.pinned && !b.pinned) return -1;
        if (!a.pinned && b.pinned) return 1;
        if (!a.completed && b.completed) return -1;
        if (a.completed && !b.completed) return 1;
        return b.createdAt - a.createdAt;
      });
    },
    [todos, selectedDate, searchQuery, statusFilter]
  );

  const streak = useMemo(() => calculateCompletionStreak(todos), [todos]);

  const reloadTodos = useCallback(async () => {
    setIsLoading(true);
    const userId = user?.id ?? null;
    const [storedTodos, storedBin] = await Promise.all([
      loadTodosFromStorage(userId),
      loadBinFromStorage(userId),
    ]);
    setTodos(storedTodos);
    setBinTodos(storedBin);
    setIsLoading(false);
  }, [user]);

  const value = useMemo(
    () => ({
      todos,
      binTodos,
      isLoading,
      isSyncing,
      selectedDate,
      setSelectedDate,
      searchQuery,
      setSearchQuery,
      statusFilter,
      setStatusFilter,
      streak,
      getSectionTodos,
      getPastPendingTasks,
      rolloverPastTasks,
      addTodo,
      addBatchTodos,
      applyRoutine,
      toggleTodo,
      toggleSubtask,
      togglePinTodo,
      moveToDate,
      moveToSection,
      duplicateTodo,
      editTodo,
      deleteTodo,
      deleteBatchTodos,
      toggleBatchComplete,
      moveBatchToDate,
      moveBatchToSection,
      undoDelete,
      restoreFromBin,
      restoreBatchFromBin,
      deletePermanently,
      deletePermanentlyBatch,
      emptyBin,
      importBackupData,
      lastDeletedTodo,
      isUndoVisible,
      dismissUndo,
      reloadTodos,
    }),
    [
      todos,
      binTodos,
      isLoading,
      isSyncing,
      selectedDate,
      setSelectedDate,
      searchQuery,
      setSearchQuery,
      statusFilter,
      setStatusFilter,
      streak,
      getSectionTodos,
      getPastPendingTasks,
      rolloverPastTasks,
      addTodo,
      addBatchTodos,
      applyRoutine,
      toggleTodo,
      toggleSubtask,
      togglePinTodo,
      moveToDate,
      moveToSection,
      duplicateTodo,
      editTodo,
      deleteTodo,
      deleteBatchTodos,
      toggleBatchComplete,
      moveBatchToDate,
      moveBatchToSection,
      undoDelete,
      restoreFromBin,
      restoreBatchFromBin,
      deletePermanently,
      deletePermanentlyBatch,
      emptyBin,
      importBackupData,
      lastDeletedTodo,
      isUndoVisible,
      dismissUndo,
      reloadTodos,
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
