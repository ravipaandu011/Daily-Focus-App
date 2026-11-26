import AsyncStorage from '@react-native-async-storage/async-storage';
import { BinNote, NoteItem } from '@/features/notes/types';

const notesKey = (userId: string) => `@daily_focus_user_${userId}_notes_v1`;
const noteBinKey = (userId: string) => `@daily_focus_user_${userId}_notes_bin_v1`;

async function loadList<T>(key: string, label: string): Promise<T[]> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed as T[];
    }
  } catch (error) {
    console.error(`Error loading ${label} from AsyncStorage:`, error);
  }
  return [];
}

async function saveList<T>(key: string, list: T[], label: string): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(list));
  } catch (error) {
    console.error(`Error saving ${label} to AsyncStorage:`, error);
  }
}

export const loadNotesFromStorage = (userId: string) => loadList<NoteItem>(notesKey(userId), 'notes');
export const saveNotesToStorage = (notes: NoteItem[], userId: string) => saveList(notesKey(userId), notes, 'notes');
export const loadNoteBinFromStorage = (userId: string) => loadList<BinNote>(noteBinKey(userId), 'note bin');
export const saveNoteBinToStorage = (bin: BinNote[], userId: string) => saveList(noteBinKey(userId), bin, 'note bin');
