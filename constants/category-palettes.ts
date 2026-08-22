export interface GradientPalette {
  id: string;
  name: string;
  gradient: [string, string];
  color: string;
  lightBg: string;
  accentColor: string;
}

export const GRADIENT_PALETTES: GradientPalette[] = [
  {
    id: 'cosmic_violet',
    name: 'Cosmic Violet',
    gradient: ['#6366F1', '#A855F7'],
    color: '#7C3AED',
    lightBg: '#F5F3FF',
    accentColor: '#6D28D9',
  },
  {
    id: 'neon_fuchsia',
    name: 'Neon Fuchsia',
    gradient: ['#7C3AED', '#C026D3'],
    color: '#9333EA',
    lightBg: '#FAF5FF',
    accentColor: '#7E22CE',
  },
  {
    id: 'sunset_flare',
    name: 'Sunset Flare',
    gradient: ['#C026D3', '#F43F5E'],
    color: '#D946EF',
    lightBg: '#FDF2F8',
    accentColor: '#BE185D',
  },
  {
    id: 'coral_glow',
    name: 'Coral Glow',
    gradient: ['#F43F5E', '#F97316'],
    color: '#EA580C',
    lightBg: '#FFF7ED',
    accentColor: '#C2410C',
  },
  {
    id: 'solar_amber',
    name: 'Solar Amber',
    gradient: ['#F97316', '#FBBF24'],
    color: '#F59E0B',
    lightBg: '#FFFBEB',
    accentColor: '#B45309',
  },
  {
    id: 'purple_haze',
    name: 'Purple Haze',
    gradient: ['#4C1D95', '#DB2777'],
    color: '#6B21A8',
    lightBg: '#FDF4FF',
    accentColor: '#86198F',
  },
  {
    id: 'cyber_sunset',
    name: 'Cyber Sunset',
    gradient: ['#8B5CF6', '#F97316'],
    color: '#A855F7',
    lightBg: '#FFF7ED',
    accentColor: '#C2410C',
  },
  {
    id: 'crimson_dusk',
    name: 'Crimson Dusk',
    gradient: ['#BE123C', '#FB923C'],
    color: '#E11D48',
    lightBg: '#FFF1F2',
    accentColor: '#9F1239',
  },
  {
    id: 'aurora_borealis',
    name: 'Aurora Night',
    gradient: ['#312E81', '#7C3AED'],
    color: '#4338CA',
    lightBg: '#EEF2FF',
    accentColor: '#3730A3',
  },
];

export const CATEGORY_EMOJIS = [
  '🚀', '💰', '💡', '📖', '🧘', '🛒', '🎨', '🎵',
  '✈️', '💻', '📈', '☕', '🎮', '🌿', '🛠️', '🎯',
  '🍳', '🐶', '❤️', '🎬', '🏆', '🔥', '🔮', '🌟',
];
