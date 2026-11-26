import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';

const NOTIF_MORNING_ENABLED_KEY = '@personal_todo_notif_morning_v2';
const NOTIF_MORNING_TIME_KEY = '@personal_todo_notif_morning_time_v2';
const NOTIF_MORNING_ID_KEY = '@personal_todo_notif_morning_id_v2';

const NOTIF_EVENING_ENABLED_KEY = '@personal_todo_notif_evening_v2';
const NOTIF_EVENING_TIME_KEY = '@personal_todo_notif_evening_time_v2';
const NOTIF_EVENING_ID_KEY = '@personal_todo_notif_evening_id_v2';

const DEFAULT_MORNING_TIME = '09:00';
const DEFAULT_EVENING_TIME = '20:00';

// Configure foreground notification presentation handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// Configure high-priority Android notification channel.
// Never throws: a channel failure must not crash startup or block reminder scheduling.
export async function setupNotificationChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  try {
    // No `sound` key: Android then uses the system default notification sound.
    // Passing sound: 'default' makes expo-notifications look for a bundled raw file named "default".
    await Notifications.setNotificationChannelAsync('daily-reminders', {
      name: 'Daily Reminders',
      // eslint-disable-next-line import/namespace -- exists (re-exported with `export *`); the lint plugin can't follow it
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#8B5CF6',
      enableVibrate: true,
      showBadge: true,
    });
  } catch (err) {
    console.warn('Could not set up the Android notification channel:', err);
  }
}

// Request permission from the user
async function requestNotificationPermission(): Promise<boolean> {
  if (Platform.OS === 'web') return true;

  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus === 'granted') {
      await setupNotificationChannel();
      return true;
    }
    return false;
  } catch (err) {
    console.warn('Error requesting notification permissions:', err);
    return false;
  }
}

interface ReminderSettings {
  morning: boolean;
  morningTime: string; // 'HH:MM' (24-hour)
  evening: boolean;
  eveningTime: string; // 'HH:MM' (24-hour)
}

// Load reminder settings from storage
export async function getReminderSettings(): Promise<ReminderSettings> {
  try {
    const [mEnabled, mTime, eEnabled, eTime] = await Promise.all([
      AsyncStorage.getItem(NOTIF_MORNING_ENABLED_KEY),
      AsyncStorage.getItem(NOTIF_MORNING_TIME_KEY),
      AsyncStorage.getItem(NOTIF_EVENING_ENABLED_KEY),
      AsyncStorage.getItem(NOTIF_EVENING_TIME_KEY),
    ]);

    return {
      morning: mEnabled === 'true',
      morningTime: mTime || DEFAULT_MORNING_TIME,
      evening: eEnabled === 'true',
      eveningTime: eTime || DEFAULT_EVENING_TIME,
    };
  } catch {
    return {
      morning: false,
      morningTime: DEFAULT_MORNING_TIME,
      evening: false,
      eveningTime: DEFAULT_EVENING_TIME,
    };
  }
}

/** Parses 'HH:MM' (24-hour). Invalid parts fall back to 9:00. Midnight (00:xx) is valid. */
export function parseTime(timeStr: string): { hour: number; minute: number } {
  const [h, m] = timeStr.split(':').map((part) => Number(part));
  const hour = Number.isInteger(h) && h >= 0 && h < 24 ? h : 9;
  const minute = Number.isInteger(m) && m >= 0 && m < 60 ? m : 0;
  return { hour, minute };
}

// Format 24-hour 'HH:MM' to 12-hour display '9:00 AM'
export function formatTime12Hour(timeStr: string): string {
  const { hour, minute } = parseTime(timeStr);
  const period = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;
  const displayMinute = minute < 10 ? `0${minute}` : minute;
  return `${displayHour}:${displayMinute} ${period}`;
}

// Calls run one at a time so quick toggles can't leave a stray or duplicate reminder.
let reminderQueue: Promise<unknown> = Promise.resolve();

/**
 * Turns a daily reminder on or off and saves its time.
 * Returns false when it could not be scheduled (e.g. permission denied); it is then saved as off.
 */
export function setDailyReminder(
  type: 'morning' | 'evening',
  enabled: boolean,
  timeString?: string
): Promise<boolean> {
  const run = reminderQueue.then(() => applyDailyReminder(type, enabled, timeString));
  reminderQueue = run.catch(() => {});
  return run;
}

async function applyDailyReminder(
  type: 'morning' | 'evening',
  enabled: boolean,
  timeString?: string
): Promise<boolean> {
  const isMorning = type === 'morning';
  const enabledKey = isMorning ? NOTIF_MORNING_ENABLED_KEY : NOTIF_EVENING_ENABLED_KEY;
  const timeKey = isMorning ? NOTIF_MORNING_TIME_KEY : NOTIF_EVENING_TIME_KEY;
  const legacyIdKey = isMorning ? NOTIF_MORNING_ID_KEY : NOTIF_EVENING_ID_KEY;
  // A fixed id per reminder: scheduling again replaces it instead of adding a second one.
  const identifier = isMorning ? 'daily-morning' : 'daily-evening';

  if (timeString) await AsyncStorage.setItem(timeKey, timeString);

  // Cancel what is scheduled now (also the random id older app versions stored).
  if (Platform.OS !== 'web') {
    try {
      await Notifications.cancelScheduledNotificationAsync(identifier);
      const legacyId = await AsyncStorage.getItem(legacyIdKey);
      if (legacyId) {
        await Notifications.cancelScheduledNotificationAsync(legacyId);
        await AsyncStorage.removeItem(legacyIdKey);
      }
    } catch (err) {
      console.warn('Error cancelling existing notification:', err);
    }
  }

  if (!enabled || Platform.OS === 'web') {
    await AsyncStorage.setItem(enabledKey, enabled ? 'true' : 'false');
    return true;
  }

  const hasPermission = await requestNotificationPermission();
  if (!hasPermission) {
    await AsyncStorage.setItem(enabledKey, 'false');
    return false;
  }

  const targetTime =
    timeString || (await AsyncStorage.getItem(timeKey)) || (isMorning ? DEFAULT_MORNING_TIME : DEFAULT_EVENING_TIME);
  const { hour, minute } = parseTime(targetTime);

  try {
    await Notifications.scheduleNotificationAsync({
      identifier,
      content: {
        title: isMorning ? '🌅 Morning Focus & Goals' : '🌙 Evening Recap & Wins',
        body: isMorning
          ? 'Start your day with clarity! Open Daily Focus to review your goals.'
          : 'Review what you got done today and plan for tomorrow.',
        sound: 'default',
        priority: Notifications.AndroidNotificationPriority.MAX,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour,
        minute,
        channelId: 'daily-reminders',
      },
    });
    await AsyncStorage.setItem(enabledKey, 'true');
    return true;
  } catch (err) {
    console.warn('Error scheduling daily notification:', err);
    await AsyncStorage.setItem(enabledKey, 'false');
    return false;
  }
}
