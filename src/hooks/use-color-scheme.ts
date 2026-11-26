import { useOptionalAppTheme } from '@/context/theme-context';

export function useColorScheme(): 'light' | 'dark' {
  return useOptionalAppTheme()?.colorScheme ?? 'light';
}
