/**
 * Theme Provider
 *
 * Combines React Native Paper's PaperProvider with React Navigation's ThemeProvider
 * to provide a unified theming experience with Material 3 dynamic colors.
 */

import React, { createContext, useContext, useMemo } from 'react';
import { PaperProvider } from 'react-native-paper';
import { ThemeProvider as NavigationThemeProvider } from '@react-navigation/native';
import { useDynamicTheme, AppTheme } from './dynamic-theme';
import { M3Colors } from './colors';

/**
 * Theme context value type
 */
interface ThemeContextValue {
  /** Whether dark mode is active */
  isDark: boolean;
  /** Whether dynamic theming is active (Android 12+) */
  isDynamic: boolean;
  /** Raw M3 colors */
  colors: typeof M3Colors.light;
  /** Paper theme object */
  theme: AppTheme;
  /** Update the dynamic theme source color */
  updateTheme: (sourceColor: string) => void;
  /** Reset to the default seed color */
  resetTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

/**
 * Hook to access theme context
 */
export function useAppTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useAppTheme must be used within AppThemeProvider');
  }
  return context;
}

interface AppThemeProviderProps {
  children: React.ReactNode;
}

/**
 * App Theme Provider
 *
 * Wraps the app with both Paper and Navigation theme providers,
 * providing Material 3 dynamic theming throughout the app.
 */
export function AppThemeProvider({ children }: AppThemeProviderProps) {
  const {
    paperTheme,
    navigationTheme,
    isDynamic,
    isDark,
    colors,
    updateTheme,
    resetTheme,
  } = useDynamicTheme();

  const contextValue = useMemo<ThemeContextValue>(
    () => ({
      isDark,
      isDynamic,
      colors: colors as typeof M3Colors.light,
      theme: paperTheme,
      updateTheme,
      resetTheme,
    }),
    [isDark, isDynamic, colors, paperTheme, updateTheme, resetTheme]
  );

  return (
    <ThemeContext.Provider value={contextValue}>
      <PaperProvider theme={paperTheme}>
        <NavigationThemeProvider value={navigationTheme}>
          {children}
        </NavigationThemeProvider>
      </PaperProvider>
    </ThemeContext.Provider>
  );
}
