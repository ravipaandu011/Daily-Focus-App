import { NoteColor } from '@/features/notes/types';
import { GradientColors, TODO_CONFIG } from '@/constants/sections';

export interface NoteColorConfig {
  key: NoteColor;
  label: string;
  /** Accent used for the card stripe and the color swatch. */
  accent: string;
  /** Card background in light mode. */
  lightBg: string;
  /** Card background in dark mode. */
  darkBg: string;
}

export const NOTE_COLORS: NoteColorConfig[] = [
  { key: 'default', label: 'Default', accent: '#94A3B8', lightBg: '#FFFFFF', darkBg: '#1E293B' },
  { key: 'blue', label: 'Blue', accent: '#3B82F6', lightBg: '#EFF6FF', darkBg: '#1B2A4A' },
  { key: 'green', label: 'Green', accent: '#10B981', lightBg: '#ECFDF5', darkBg: '#143A35' },
  { key: 'yellow', label: 'Yellow', accent: '#EAB308', lightBg: '#FEFCE8', darkBg: '#3A3517' },
  { key: 'pink', label: 'Pink', accent: '#EC4899', lightBg: '#FDF2F8', darkBg: '#3F1D33' },
  { key: 'purple', label: 'Purple', accent: '#8B5CF6', lightBg: '#F5F3FF', darkBg: '#2E2350' },
];

export function getNoteColor(key: NoteColor | string | undefined): NoteColorConfig {
  return NOTE_COLORS.find((c) => c.key === key) ?? NOTE_COLORS[0];
}

/**
 * Notes uses the same theme as Todo (Deep Teal -> Mint Green -> Lemon Yellow),
 * so both tabs share one source of truth in TODO_CONFIG.
 */
export const NOTES_GRADIENT: GradientColors = TODO_CONFIG.gradient;
/** Solid Notes accent (pins, spinner, shadows). */
export const NOTES_ACCENT = TODO_CONFIG.color;
/** Icon/text color on top of NOTES_GRADIENT. */
export const NOTES_ON_GRADIENT = TODO_CONFIG.onGradient;
