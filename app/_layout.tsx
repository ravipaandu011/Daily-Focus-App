import '@/utils/suppress-warnings';
import React, { useEffect } from 'react';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator, StyleSheet, Image } from 'react-native';
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
        <Image
          source={require('@/assets/images/icon.png')}
          style={styles.splashImage}
          resizeMode="contain"
        />
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
  splashImage: {
    width: 92,
    height: 92,
    borderRadius: 22,
  },
});

