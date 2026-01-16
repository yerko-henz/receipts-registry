import { useTheme } from '@/components/ThemeProvider';

export function useColorScheme() {
  const { activeTheme } = useTheme();
  return activeTheme;
}
