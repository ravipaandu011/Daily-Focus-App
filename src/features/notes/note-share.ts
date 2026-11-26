import { Platform, Share, ToastAndroid } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { NoteItem } from '@/features/notes/types';

/** Plain-text version of a note: title, a blank line, then the body. */
export function noteToText(note: Pick<NoteItem, 'title' | 'body'>): string {
  const title = note.title.trim();
  const body = note.body.trim();
  return title && body ? `${title}\n\n${body}` : title || body;
}

/** Opens the system share sheet (WhatsApp, email, etc.) with the note's text. */
export async function shareNote(note: Pick<NoteItem, 'title' | 'body'>): Promise<void> {
  const message = noteToText(note);
  if (!message) return;
  try {
    await Share.share({ message, ...(note.title.trim() ? { title: note.title.trim() } : {}) });
  } catch (e) {
    console.warn('Could not share note:', e);
  }
}

/** Copies the note's text to the clipboard and confirms with a haptic (and a toast on Android). */
export async function copyNote(note: Pick<NoteItem, 'title' | 'body'>): Promise<void> {
  const text = noteToText(note);
  if (!text) return;
  await Clipboard.setStringAsync(text);
  if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  if (Platform.OS === 'android') ToastAndroid.show('Note copied', ToastAndroid.SHORT);
}
