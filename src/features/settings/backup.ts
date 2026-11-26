import { PriorityLevel, SubtaskItem, TodoItem } from '@/features/tasks/types';
import { TODO_SECTION_KEY } from '@/constants/sections';
import { NoteItem } from '@/features/notes/types';
import { getNoteColor } from '@/features/notes/note-colors';
import { formatDateKey, getTodayKey } from '@/utils/date';

interface BackupData {
  version: number;
  exportedAt: string;
  app: string;
  todos: TodoItem[];
  binTodos: TodoItem[];
  /** Added in version 2. Older backups have no notes. */
  notes?: NoteItem[];
}

export function generateBackupJson(todos: TodoItem[], binTodos: TodoItem[], notes: NoteItem[]): string {
  const data: BackupData = {
    version: 2,
    exportedAt: new Date().toISOString(),
    app: 'Daily Focus App',
    todos,
    binTodos,
    notes,
  };
  return JSON.stringify(data, null, 2);
}

const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;
const PRIORITIES: PriorityLevel[] = ['high', 'medium', 'low'];
// Reasonable range for timestamps: year 2000 to year 2100.
const MIN_TIME = 946684800000;
const MAX_TIME = 4102444800000;

function asTime(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) && value >= MIN_TIME && value <= MAX_TIME
    ? value
    : fallback;
}

function asDateKey(value: unknown, fallback: string): string {
  return typeof value === 'string' && DATE_KEY.test(value) ? value : fallback;
}

function asOptionalText(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value : undefined;
}

function asSubtasks(value: unknown): SubtaskItem[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const list = value
    .filter((st) => st && typeof st.id === 'string' && typeof st.title === 'string')
    .map((st) => ({ id: st.id, title: st.title, completed: Boolean(st.completed) }));
  return list.length > 0 ? list : undefined;
}

/** A task from a backup, or null if it is not usable. Keeps every field the app exports. */
function parseTodo(item: any): TodoItem | null {
  if (!item || typeof item.id !== 'string' || !item.id || typeof item.text !== 'string' || !item.text.trim()) {
    return null;
  }
  const createdAt = asTime(item.createdAt, Date.now());
  return {
    id: item.id,
    text: item.text.trim(),
    completed: Boolean(item.completed),
    createdAt,
    section: typeof item.section === 'string' ? item.section : TODO_SECTION_KEY,
    date: asDateKey(item.date, formatDateKey(new Date(createdAt))),
    pinned: Boolean(item.pinned),
    priority: PRIORITIES.includes(item.priority) ? item.priority : undefined,
    tag: asOptionalText(item.tag),
    subtasks: asSubtasks(item.subtasks),
    notes: asOptionalText(item.notes),
  };
}

function parseNote(n: any): NoteItem | null {
  if (!n || typeof n.id !== 'string' || !n.id || (typeof n.title !== 'string' && typeof n.body !== 'string')) {
    return null;
  }
  const createdAt = asTime(n.createdAt, Date.now());
  return {
    id: n.id,
    title: typeof n.title === 'string' ? n.title : '',
    body: typeof n.body === 'string' ? n.body : '',
    color: getNoteColor(n.color).key,
    pinned: Boolean(n.pinned),
    date: asDateKey(n.date, formatDateKey(new Date(createdAt))),
    createdAt,
    updatedAt: asTime(n.updatedAt, createdAt),
  };
}

/** Parses each entry and drops unusable ones and repeated ids (the first copy wins). */
function parseList<T extends { id: string }>(value: unknown, parse: (item: any) => T | null): T[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const out: T[] = [];
  for (const raw of value) {
    const item = parse(raw);
    if (item && !seen.has(item.id)) {
      seen.add(item.id);
      out.push(item);
    }
  }
  return out;
}

export function parseAndValidateBackup(
  rawJson: string
):
  | { success: true; data: { todos: TodoItem[]; binTodos: TodoItem[]; notes?: NoteItem[] } }
  | { success: false; error: string } {
  let parsed: any;
  try {
    parsed = JSON.parse(rawJson);
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Invalid JSON';
    return { success: false, error: `JSON Parse error: ${errorMsg}` };
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return { success: false, error: 'Invalid JSON format: expected an object.' };
  }
  if (!Array.isArray(parsed.todos)) {
    return { success: false, error: 'Invalid backup: missing "todos" list.' };
  }

  const todos = parseList(parsed.todos, parseTodo);
  const todoIds = new Set(todos.map((t) => t.id));
  const today = getTodayKey();
  const binTodos = parseList(parsed.binTodos, (raw) => {
    const item = parseTodo(raw);
    // A task cannot be both in the list and in the bin.
    if (!item || todoIds.has(item.id)) return null;
    return { ...item, date: item.date || today, deletedAt: asTime(raw.deletedAt, Date.now()) };
  });

  // Notes are optional so version 1 backups (todos only) still restore; their notes are left untouched.
  const notes = Array.isArray(parsed.notes) ? parseList(parsed.notes, parseNote) : undefined;

  return { success: true, data: { todos, binTodos, notes } };
}
