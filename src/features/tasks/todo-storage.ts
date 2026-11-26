import AsyncStorage from '@react-native-async-storage/async-storage';
import { TodoItem } from '@/features/tasks/types';
import { getTodayKey } from '@/utils/date';

const tasksKey = (userId: string) => `@personal_todo_user_${userId}_tasks_v2`;
const binKey = (userId: string) => `@personal_todo_user_${userId}_bin_v2`;

async function loadList(key: string, label: string): Promise<TodoItem[]> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed as TodoItem[];
    }
  } catch (error) {
    console.error(`Error loading ${label} from AsyncStorage:`, error);
  }
  return [];
}

async function saveList(key: string, list: TodoItem[], label: string): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(list));
  } catch (error) {
    console.error(`Error saving ${label} to AsyncStorage:`, error);
  }
}

/** The user's cached tasks ([] when there are none yet; the cloud copy then fills them in). */
export async function loadTodosFromStorage(userId: string): Promise<TodoItem[]> {
  const today = getTodayKey();
  // Very old tasks had no date: they belong to today.
  return (await loadList(tasksKey(userId), 'tasks')).map((item) => ({ ...item, date: item.date || today }));
}

export const saveTodosToStorage = (todos: TodoItem[], userId: string) => saveList(tasksKey(userId), todos, 'tasks');
export const loadBinFromStorage = (userId: string) => loadList(binKey(userId), 'bin');
export const saveBinToStorage = (bin: TodoItem[], userId: string) => saveList(binKey(userId), bin, 'bin');
