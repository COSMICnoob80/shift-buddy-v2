import React, { createContext, useContext, useEffect, useState } from 'react';
import { useColorScheme } from 'react-native';
import { Colors } from './colors';

type ThemeMode = 'light' | 'dark' | 'auto';

type GetPreferredThemeFn = () => Promise<ThemeMode>;

interface ThemeContextType {
  colors: typeof Colors.light;
  colorScheme: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

let preferredThemeCallback: GetPreferredThemeFn | null = null;

export function setPreferredThemeCallback(fn: GetPreferredThemeFn) {
  preferredThemeCallback = fn;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemColorScheme = useColorScheme() ?? 'light';
  const [userMode, setUserMode] = useState<ThemeMode>('auto');
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (preferredThemeCallback) {
      preferredThemeCallback().then((mode) => {
        setUserMode(mode);
        setLoaded(true);
      });
    } else {
      setLoaded(true);
    }
  }, []);

  const effectiveScheme: 'light' | 'dark' =
    userMode === 'auto' ? systemColorScheme : userMode;

  const colors = Colors[effectiveScheme];

  const setThemeMode = (mode: ThemeMode) => {
    setUserMode(mode);
  };

  return (
    <ThemeContext.Provider value={{ colors, colorScheme: userMode, setThemeMode }}>
      {loaded ? children : null}
    </ThemeContext.Provider>
  );
}

export { Colors };

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

export type { ThemeMode };
