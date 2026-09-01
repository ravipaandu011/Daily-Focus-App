import { LogBox } from 'react-native';

// Suppress the Expo Go Android remote push notification notice
// (Daily Focus uses local scheduled notifications which work completely fine in Expo Go)
LogBox.ignoreLogs([
  'expo-notifications: Android Push notifications',
  'Android Push notifications (remote notifications)',
]);

if (__DEV__) {
  const originalConsoleError = console.error;
  console.error = (...args: unknown[]) => {
    if (
      typeof args[0] === 'string' &&
      args[0].includes('expo-notifications: Android Push notifications')
    ) {
      return;
    }
    originalConsoleError(...args);
  };
}
