import { TodoItem } from '@/types/todo';

export interface BackupData {
  version: number;
  exportedAt: string;
  app: string;
  todos: TodoItem[];
  binTodos: TodoItem[];
}

export function generateBackupJson(todos: TodoItem[], binTodos: TodoItem[]): string {
  const data: BackupData = {
    version: 1,
    exportedAt: new Date().toISOString(),
    app: 'Daily Focus App',
    todos,
    binTodos,
  };
  return JSON.stringify(data, null, 2);
}

export function parseAndValidateBackup(
  rawJson: string
): { success: true; data: { todos: TodoItem[]; binTodos: TodoItem[] } } | { success: false; error: string } {
  try {
    const parsed = JSON.parse(rawJson);

    if (!parsed || typeof parsed !== 'object') {
      return { success: false, error: 'Invalid JSON format: expected an object.' };
    }

    if (!Array.isArray(parsed.todos)) {
      return { success: false, error: 'Invalid backup: missing "todos" list.' };
    }

    const validTodos: TodoItem[] = [];
    for (const item of parsed.todos) {
      if (item && typeof item.id === 'string' && typeof item.text === 'string' && typeof item.section === 'string') {
        validTodos.push({
          id: String(item.id),
          text: String(item.text).trim(),
          completed: Boolean(item.completed),
          createdAt: typeof item.createdAt === 'number' ? item.createdAt : Date.now(),
          section: item.section,
          date: typeof item.date === 'string' ? item.date : new Date().toISOString().split('T')[0],
          pinned: Boolean(item.pinned),
        });
      }
    }

    const validBin: TodoItem[] = [];
    if (Array.isArray(parsed.binTodos)) {
      for (const item of parsed.binTodos) {
        if (item && typeof item.id === 'string' && typeof item.text === 'string' && typeof item.section === 'string') {
          validBin.push({
            id: String(item.id),
            text: String(item.text).trim(),
            completed: Boolean(item.completed),
            createdAt: typeof item.createdAt === 'number' ? item.createdAt : Date.now(),
            section: item.section,
            date: typeof item.date === 'string' ? item.date : new Date().toISOString().split('T')[0],
            pinned: Boolean(item.pinned),
            deletedAt: typeof item.deletedAt === 'number' ? item.deletedAt : Date.now(),
          });
        }
      }
    }

    return {
      success: true,
      data: {
        todos: validTodos,
        binTodos: validBin,
      },
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Invalid JSON';
    return { success: false, error: `JSON Parse error: ${errorMsg}` };
  }
}
