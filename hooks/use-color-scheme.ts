import { useAppTheme } from '@/context/theme-context';

export function useColorScheme(): 'light' | 'dark' {
  try {
    const { colorScheme } = useAppTheme();
    return colorScheme;
  } catch {
    return 'light';
  }
}
