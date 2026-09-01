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
    color: '#3F90C0',
    gradient: ['#3F90C0', '#283582'], // Cerulean Steel Blue to Deep Midnight Navy
    lightBg: '#F0F6FA',
    accentColor: '#283582',
    iconName: 'briefcase-outline',
    activeIconName: 'briefcase',
  },
  education: {
    key: 'education',
    title: 'Learn Todo',
    emoji: '📖',
    tabLabel: 'Learn',
    color: '#E63444',
    gradient: ['#E63444', '#6950EC'], // Crimson Scarlet to Electric Indigo
    lightBg: '#FEF2F2',
    accentColor: '#6950EC',
    iconName: 'book-outline',
    activeIconName: 'book',
  },
  gym: {
    key: 'gym',
    title: 'Gym Todo',
    emoji: '🏋️',
    tabLabel: 'Gym',
    color: '#707AAD',
    gradient: ['#DAA3D1', '#004982'], // Soft Lavender Rose to Deep Ocean Navy
    lightBg: '#F5F3FF',
    accentColor: '#004982',
    iconName: 'barbell-outline',
    activeIconName: 'barbell',
  },
  home: {
    key: 'home',
    title: 'Home Todo',
    emoji: '🏠',
    tabLabel: 'Home',
    color: '#00E0AB',
    gradient: ['#00E0AB', '#002E9C'], // Neon Mint Seafoam to Deep Ocean Cobalt
    lightBg: '#F0FDF9',
    accentColor: '#002E9C',
    iconName: 'home-outline',
    activeIconName: 'home',
  },
  personal: {
    key: 'personal',
    title: 'Personal Todo',
    emoji: '✨',
    tabLabel: 'Personal',
    color: '#FFA057',
    gradient: ['#0A39E0', '#FE6409'], // Electric Cobalt Blue to Flame Sunset
    lightBg: '#F0F4FF',
    accentColor: '#0A39E0',
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






