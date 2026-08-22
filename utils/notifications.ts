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
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// Configure high-priority Android notification channel
export async function setupNotificationChannel(): Promise<void> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('daily-reminders', {
      name: 'Daily Reminders',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#8B5CF6',
      sound: 'default',
      enableVibrate: true,
      showBadge: true,
    });
  }
}

// Request permission from the user
export async function requestNotificationPermission(): Promise<boolean> {
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

export interface ReminderSettings {
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

// Parse 'HH:MM' to { hour, minute }
function parseTime(timeStr: string): { hour: number; minute: number } {
  const parts = timeStr.split(':');
  const hour = parseInt(parts[0], 10) || 9;
  const minute = parseInt(parts[1], 10) || 0;
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

// Schedule or update a daily reminder
export async function setDailyReminder(
  type: 'morning' | 'evening',
  enabled: boolean,
  timeString?: string
): Promise<boolean> {
  const isMorning = type === 'morning';
  const enabledKey = isMorning ? NOTIF_MORNING_ENABLED_KEY : NOTIF_EVENING_ENABLED_KEY;
  const timeKey = isMorning ? NOTIF_MORNING_TIME_KEY : NOTIF_EVENING_TIME_KEY;
  const idKey = isMorning ? NOTIF_MORNING_ID_KEY : NOTIF_EVENING_ID_KEY;

  // Persist enabled status & time
  await AsyncStorage.setItem(enabledKey, enabled ? 'true' : 'false');
  if (timeString) {
    await AsyncStorage.setItem(timeKey, timeString);
  }

  // Cancel any existing scheduled notification
  try {
    const existingId = await AsyncStorage.getItem(idKey);
    if (existingId) {
      await Notifications.cancelScheduledNotificationAsync(existingId);
      await AsyncStorage.removeItem(idKey);
    }
  } catch (err) {
    console.warn('Error cancelling existing notification:', err);
  }

  if (!enabled || Platform.OS === 'web') {
    return true;
  }

  // Ensure permissions
  const hasPermission = await requestNotificationPermission();
  if (!hasPermission) {
    return false;
  }

  // Determine scheduled time
  const targetTime = timeString || (await AsyncStorage.getItem(timeKey)) || (isMorning ? DEFAULT_MORNING_TIME : DEFAULT_EVENING_TIME);
  const { hour, minute } = parseTime(targetTime);

  try {
    const title = isMorning ? '🌅 Morning Focus & Goals' : '🌙 Evening Recap & Wins';
    const body = isMorning
      ? 'Start your day with clarity! Open Personal To-Do to review your goals.'
      : 'Check off your completed tasks today and keep your streak alive!';

    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
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

    await AsyncStorage.setItem(idKey, notificationId);
    return true;
  } catch (err) {
    console.warn('Error scheduling daily notification:', err);
    return false;
  }
}

// Send an instant test notification (fires after 1 second)
export async function sendTestNotification(): Promise<boolean> {
  if (Platform.OS === 'web') return true;

  const hasPermission = await requestNotificationPermission();
  if (!hasPermission) {
    return false;
  }

  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '🔔 Notification Test Successful!',
        body: 'Daily reminders are active and working smoothly on your device.',
        sound: 'default',
        priority: Notifications.AndroidNotificationPriority.MAX,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: 1,
        channelId: 'daily-reminders',
      },
    });
    return true;
  } catch (err) {
    console.warn('Error sending test notification:', err);
    return false;
  }
}
