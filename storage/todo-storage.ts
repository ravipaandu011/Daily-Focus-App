import AsyncStorage from '@react-native-async-storage/async-storage';
import { TodoItem } from '@/types/todo';
import { getTodayKey, getYesterdayKey, getTomorrowKey } from '@/utils/date';

export const getUserStorageKey = (userId?: string | null): string => {
  if (userId) {
    return `@personal_todo_user_${userId}_tasks_v2`;
  }
  return '@personal_todo_guest_tasks_v2';
};

export const getUserBinKey = (userId?: string | null): string => {
  if (userId) {
    return `@personal_todo_user_${userId}_bin_v2`;
  }
  return '@personal_todo_guest_bin_v2';
};

export const getGuestInitialTodos = (): TodoItem[] => {
  const today = getTodayKey();
  const yesterday = getYesterdayKey();
  const tomorrow = getTomorrowKey();

  return [
    // --- WORK ---
    {
      id: 'demo_work_1',
      text: 'Review quarterly goals & roadmap',
      completed: true,
      createdAt: Date.now() - 1000 * 60 * 60 * 24,
      section: 'work',
      date: yesterday,
    },
    {
      id: 'demo_work_2',
      text: 'Schedule product sprint planning',
      completed: false,
      createdAt: Date.now() - 1000 * 60 * 60 * 3,
      section: 'work',
      date: today,
    },
    {
      id: 'demo_work_3',
      text: 'Send client presentation slides',
      completed: false,
      createdAt: Date.now() - 1000 * 60 * 60 * 1,
      section: 'work',
      date: today,
    },
    // --- EDUCATION ---
    {
      id: 'demo_edu_1',
      text: 'Explore React Native architecture',
      completed: false,
      createdAt: Date.now() - 1000 * 60 * 60 * 4,
      section: 'education',
      date: today,
    },
    // --- GYM ---
    {
      id: 'demo_gym_1',
      text: 'Full body workout & stretching',
      completed: true,
      createdAt: Date.now() - 1000 * 60 * 60 * 5,
      section: 'gym',
      date: today,
    },
    // --- HOME ---
    {
      id: 'demo_home_1',
      text: 'Water house plants & organize desk',
      completed: false,
      createdAt: Date.now() - 1000 * 60 * 60 * 2,
      section: 'home',
      date: today,
    },
    // --- PERSONAL ---
    {
      id: 'demo_personal_1',
      text: '15 mins mindfulness meditation',
      completed: true,
      createdAt: Date.now() - 1000 * 60 * 60 * 6,
      section: 'personal',
      date: today,
    },
    {
      id: 'demo_personal_2',
      text: 'Read 20 pages of book',
      completed: false,
      createdAt: Date.now(),
      section: 'personal',
      date: tomorrow,
    },
  ];
};

/**
 * Loads todos from storage for a specific user ID or guest.
 * If user is authenticated and has no local cache yet, returns [] so cloud can populate it.
 * If guest mode on first run, provides demo starter tasks.
 */
export async function loadTodosFromStorage(userId?: string | null): Promise<TodoItem[]> {
  try {
    const key = getUserStorageKey(userId);
    const rawData = await AsyncStorage.getItem(key);

    if (rawData !== null) {
      const parsed: TodoItem[] = JSON.parse(rawData);
      if (Array.isArray(parsed)) {
        const today = getTodayKey();
        return parsed.map((item) => ({
          ...item,
          date: item.date || today,
        }));
      }
    }

    // If signed in user has no local data yet, return empty list
    if (userId) {
      return [];
    }

    // If guest mode, initialize starter tasks
    const initial = getGuestInitialTodos();
    await saveTodosToStorage(initial, null);
    return initial;
  } catch (error) {
    console.error('Error loading todos from AsyncStorage:', error);
    return [];
  }
}

/**
 * Saves todos to storage for a specific user ID or guest.
 */
export async function saveTodosToStorage(todos: TodoItem[], userId?: string | null): Promise<void> {
  try {
    const key = getUserStorageKey(userId);
    await AsyncStorage.setItem(key, JSON.stringify(todos));
  } catch (error) {
    console.error('Error saving todos to AsyncStorage:', error);
  }
}

/**
 * Loads recycle bin items for a specific user ID or guest.
 */
export async function loadBinFromStorage(userId?: string | null): Promise<TodoItem[]> {
  try {
    const key = getUserBinKey(userId);
    const rawData = await AsyncStorage.getItem(key);
    if (rawData !== null) {
      const parsed: TodoItem[] = JSON.parse(rawData);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
    return [];
  } catch (error) {
    console.error('Error loading bin from AsyncStorage:', error);
    return [];
  }
}

/**
 * Saves recycle bin items for a specific user ID or guest.
 */
export async function saveBinToStorage(binItems: TodoItem[], userId?: string | null): Promise<void> {
  try {
    const key = getUserBinKey(userId);
    await AsyncStorage.setItem(key, JSON.stringify(binItems));
  } catch (error) {
    console.error('Error saving bin to AsyncStorage:', error);
  }
}

/**
 * Clears local cache for a specific user upon explicit request
 */
export async function clearUserStorage(userId: string): Promise<void> {
  try {
    await AsyncStorage.multiRemove([getUserStorageKey(userId), getUserBinKey(userId)]);
  } catch (error) {
    console.error('Error clearing user storage:', error);
  }
}
