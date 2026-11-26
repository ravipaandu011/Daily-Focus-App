import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { TODO_CONFIG } from '@/constants/sections';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

interface EmptyStateProps {
  icon: IconName;
  title: string;
  subtitle: string;
}

const CIRCLE_SIZE = 68;

/**
 * Empty-list message shared by the Todo and Notes tabs.
 * The circle is anchored at a fixed spot and the text hangs below it, so the circle sits at
 * exactly the same position on both tabs no matter how many lines the text wraps to.
 * Render it inside a list whose content container has `flexGrow: 1`.
 */
export const EmptyState: React.FC<EmptyStateProps> = ({ icon, title, subtitle }) => {
  const theme = Colors[useColorScheme()];

  return (
    <View style={styles.container}>
      <View style={styles.anchor}>
        <LinearGradient colors={TODO_CONFIG.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.circle}>
          <Ionicons name={icon} size={30} color={TODO_CONFIG.onGradient} />
        </LinearGradient>

        <View style={styles.textBlock}>
          <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>{subtitle}</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 32,
    // Lifts the circle so circle + text read as centered in the space above the tab bar.
    paddingBottom: 140,
  },
  // Only the circle takes part in centering; the text is positioned below it.
  anchor: {
    alignItems: 'center',
  },
  circle: {
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    borderRadius: CIRCLE_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textBlock: {
    position: 'absolute',
    top: CIRCLE_SIZE + 16,
    left: 0,
    right: 0,
    alignItems: 'center',
    gap: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
});
