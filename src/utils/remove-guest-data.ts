import AsyncStorage from '@react-native-async-storage/async-storage';

/** Storage left on the device by the old guest mode (the app now always requires sign-in). */
const GUEST_KEYS = [
  '@personal_todo_is_guest_mode',
  '@personal_todo_guest_tasks_v2',
  '@personal_todo_guest_bin_v2',
  '@daily_focus_guest_notes_v1',
  '@daily_focus_guest_notes_bin_v1',
];

/** Deletes leftover guest-mode data. Safe to call on every start: it does nothing once the keys are gone. */
export async function removeGuestData(): Promise<void> {
  try {
    await AsyncStorage.multiRemove(GUEST_KEYS);
  } catch (error) {
    console.warn('Could not remove old guest data:', error);
  }
}
