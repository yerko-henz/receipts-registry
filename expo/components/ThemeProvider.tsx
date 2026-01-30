import React, { createContext, useContext, useEffect, useState } from 'react';
import { useColorScheme as useNativeColorScheme } from '@/hooks/use-native-color-scheme';
import { storage } from '@/lib/storage';

type Theme = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  activeTheme: 'light' | 'dark';
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'system',
  setTheme: () => {},
  activeTheme: 'light',
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useNativeColorScheme();
  const [theme, setThemeState] = useState<Theme>('system');
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    loadTheme();
  }, []);

  async function loadTheme() {
    const savedTheme = await storage.getTheme();
    if (savedTheme) {
      setThemeState(savedTheme as Theme);
    }
    setIsLoaded(true);
  }

  const setTheme = async (newTheme: Theme) => {
    setThemeState(newTheme);
    await storage.setTheme(newTheme);
  };

  const activeTheme = theme === 'system' ? (systemScheme ?? 'light') : theme;

  if (!isLoaded) {
    return null; // Or a splash screen
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme, activeTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
