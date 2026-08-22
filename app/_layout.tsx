import React, { useEffect } from 'react';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator, StyleSheet, LogBox } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import 'react-native-reanimated';

import { CustomThemeProvider, useAppTheme } from '@/context/theme-context';
import { AuthProvider, useAuth } from '@/context/auth-context';
import { CategoryProvider } from '@/context/category-context';
import { TodoProvider } from '@/context/todo-context';
import { AuthScreen } from '@/screens/auth-screen';
import { Colors } from '@/constants/theme';
import { setupNotificationChannel } from '@/utils/notifications';

// Ignore Expo Go remote push notification notice (local notifications work)
LogBox.ignoreLogs([
  'expo-notifications: Android Push notifications',
  'Android Push notifications (remote notifications)',
]);

export const unstable_settings = {
  anchor: '(tabs)',
};

function RootNavigation() {
  const { colorScheme } = useAppTheme();
  const theme = Colors[colorScheme];
  const { user, isLoading } = useAuth();

  useEffect(() => {
    setupNotificationChannel();
  }, []);

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
        <LinearGradient
          colors={['#2563EB', '#4F46E5', '#7C3AED']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.splashBadge}>
          <Ionicons name="checkmark-done" size={42} color="#FFFFFF" />
        </LinearGradient>
        <ActivityIndicator size="small" color="#3B82F6" style={{ marginTop: 24 }} />
        <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      </View>
    );
  }

  // If unauthenticated, gate with the Daily Focus Auth Screen
  if (!user) {
    return (
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <AuthScreen />
        <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      </Stack>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <CustomThemeProvider>
      <AuthProvider>
        <CategoryProvider>
          <TodoProvider>
            <RootNavigation />
          </TodoProvider>
        </CategoryProvider>
      </AuthProvider>
    </CustomThemeProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  splashBadge: {
    width: 80,
    height: 80,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
  },
});
