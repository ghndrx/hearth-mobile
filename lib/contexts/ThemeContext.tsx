/**
 * ThemeContext
 * Provides resolved color scheme throughout the app, respecting
 * user preference (light/dark) or falling back to system preference.
 */

import React, { createContext, useContext, useMemo } from 'react';
import { useColorScheme as useSystemColorScheme } from 'react-native';
import { useThemeStore, type ResolvedTheme, type ThemePreference } from '../stores/theme';

interface ThemeContextValue {
  colorScheme: ResolvedTheme;
  isDark: boolean;
  preference: ThemePreference;
  setPreference: (preference: ThemePreference) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  colorScheme: 'dark',
  isDark: true,
  preference: 'system',
  setPreference: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemColorScheme = useSystemColorScheme();
  const { preference, setPreference } = useThemeStore();

  const value = useMemo(() => {
    const colorScheme: ResolvedTheme =
      preference === 'system'
        ? (systemColorScheme ?? 'dark')
        : preference;

    return {
      colorScheme,
      isDark: colorScheme === 'dark',
      preference,
      setPreference,
    };
  }, [preference, setPreference, systemColorScheme]);

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}

export default ThemeProvider;
