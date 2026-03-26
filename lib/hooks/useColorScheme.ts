/**
 * Drop-in replacement for React Native's useColorScheme.
 * Returns the resolved color scheme based on user preference (light/dark/system).
 *
 * Import this instead of useColorScheme from 'react-native' so that
 * the user's theme preference is respected throughout the app.
 */

import { useColorScheme as useSystemColorScheme } from 'react-native';
import { useThemeStore } from '../stores/theme';

export function useColorScheme(): 'light' | 'dark' {
  const systemScheme = useSystemColorScheme();
  const preference = useThemeStore((s) => s.preference);

  if (preference === 'system') {
    return systemScheme ?? 'dark';
  }
  return preference;
}

export default useColorScheme;
