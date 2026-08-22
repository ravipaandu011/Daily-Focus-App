import { SectionKey } from '@/types/todo';
import { ComponentProps } from 'react';
import { Ionicons } from '@expo/vector-icons';

type IconName = ComponentProps<typeof Ionicons>['name'];

export interface SectionConfig {
  key: SectionKey;
  title: string;
  emoji: string;
  tabLabel: string;
  color: string;
  gradient: [string, string];
  lightBg: string;
  accentColor: string;
  iconName: IconName;
  activeIconName: IconName;
}

export const SECTIONS: Record<SectionKey, SectionConfig> = {
  work: {
    key: 'work',
    title: 'Work Todo',
    emoji: '💼',
    tabLabel: 'Work',
    color: '#7C3AED',
    gradient: ['#6366F1', '#A855F7'], // Indigo to Bright Purple
    lightBg: '#F5F3FF',
    accentColor: '#6D28D9',
    iconName: 'briefcase-outline',
    activeIconName: 'briefcase',
  },
  education: {
    key: 'education',
    title: 'Learn Todo',
    emoji: '📚',
    tabLabel: 'Learn',
    color: '#9333EA',
    gradient: ['#7C3AED', '#C026D3'], // Violet to Neon Fuchsia
    lightBg: '#FAF5FF',
    accentColor: '#7E22CE',
    iconName: 'book-outline',
    activeIconName: 'book',
  },
  gym: {
    key: 'gym',
    title: 'Gym Todo',
    emoji: '🏋️',
    tabLabel: 'Gym',
    color: '#D946EF',
    gradient: ['#C026D3', '#F43F5E'], // Magenta to Rose Coral
    lightBg: '#FDF2F8',
    accentColor: '#BE185D',
    iconName: 'barbell-outline',
    activeIconName: 'barbell',
  },
  home: {
    key: 'home',
    title: 'Home Todo',
    emoji: '🏠',
    tabLabel: 'Home',
    color: '#EA580C',
    gradient: ['#F43F5E', '#F97316'], // Rose to Sunset Orange
    lightBg: '#FFF7ED',
    accentColor: '#C2410C',
    iconName: 'home-outline',
    activeIconName: 'home',
  },
  personal: {
    key: 'personal',
    title: 'Personal Todo',
    emoji: '🎯',
    tabLabel: 'Personal',
    color: '#F59E0B',
    gradient: ['#F97316', '#FBBF24'], // Sunset Orange to Radiant Gold
    lightBg: '#FFFBEB',
    accentColor: '#B45309',
    iconName: 'sparkles-outline',
    activeIconName: 'sparkles',
  },
};

export const SECTION_KEYS: SectionKey[] = [
  'work',
  'education',
  'gym',
  'home',
  'personal',
];
