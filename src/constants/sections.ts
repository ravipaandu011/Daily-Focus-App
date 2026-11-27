import { SectionKey } from '@/features/tasks/types';
import { ComponentProps } from 'react';
import { Ionicons } from '@expo/vector-icons';

type IconName = ComponentProps<typeof Ionicons>['name'];

/** Two or more color stops, as accepted by expo-linear-gradient. */
export type GradientColors = readonly [string, string, ...string[]];

export interface SectionConfig {
  key: SectionKey;
  title: string;
  emoji: string;
  tabLabel: string;
  color: string;
  gradient: GradientColors;
  lightBg: string;
  accentColor: string;
  iconName: IconName;
  activeIconName: IconName;
  /** Icon/text color for content drawn on top of `gradient`. */
  onGradient: string;
}

/**
 * The app has a single Todo list. Tasks still carry a `section` value for backward
 * compatibility with existing JSON backups and stored documents, though the app no longer groups by it.
 */
export const TODO_SECTION_KEY: SectionKey = 'todo';

export const TODO_CONFIG: SectionConfig = {
  key: TODO_SECTION_KEY,
  title: 'Todo',
  emoji: '✅',
  tabLabel: 'Todo',
  // Solid tone for text, icons, borders and chip fills: the teal end of the gradient,
  // readable on the light (#F8FAFC) and dark (#0F172A) backgrounds and under white text.
  color: '#2A7B9B',
  // Deep Teal -> Mint Green -> Lemon Yellow:
  // linear-gradient(90deg, #2A7B9B 0%, #57C785 50%, #EDDD53 100%). Shared with Notes.
  gradient: ['#2A7B9B', '#57C785', '#EDDD53'],
  lightBg: '#EAF6F1',
  accentColor: '#2A7B9B',
  // White is too faint on the green and yellow stops, so content on the gradient uses dark ink.
  onGradient: '#0F2A33',
  iconName: 'checkmark-done-outline',
  activeIconName: 'checkmark-done',
};
