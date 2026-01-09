/**
 * Dynamic Theme Hook
 *
 * Provides Material You dynamic color theming with fallback to static colors.
 * Uses wallpaper-extracted colors on Android 12+ and falls back to the
 * purple/violet seed color on other platforms.
 */

import { useEffect, useRef } from 'react';
import { useMaterial3Theme } from '@pchmn/expo-material3-theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAccentColor } from '@/src/application/state/settings-store';
import {
  MD3DarkTheme,
  MD3LightTheme,
  adaptNavigationTheme,
} from 'react-native-paper';
import {
  DarkTheme as NavigationDarkTheme,
  DefaultTheme as NavigationDefaultTheme,
} from '@react-navigation/native';
import { M3Colors, M3ColorScheme, SEED_COLOR } from './colors';

/**
 * Merged Paper theme type
 */
export type AppTheme = typeof MD3LightTheme & {
  colors: typeof MD3LightTheme.colors & M3ColorScheme;
};

/**
 * Create a Paper theme from M3 colors
 */
function createPaperTheme(colors: M3ColorScheme, isDark: boolean) {
  const baseTheme = isDark ? MD3DarkTheme : MD3LightTheme;

  return {
    ...baseTheme,
    colors: {
      ...baseTheme.colors,
      ...colors,
      // Map surface container colors to Paper's elevation colors
      elevation: {
        level0: colors.elevation.level0,
        level1: colors.elevation.level1,
        level2: colors.elevation.level2,
        level3: colors.elevation.level3,
        level4: colors.elevation.level4,
        level5: colors.elevation.level5,
      },
    },
  } as AppTheme;
}

/**
 * Adapt React Navigation theme to use Paper colors
 */
const { LightTheme: AdaptedLightTheme, DarkTheme: AdaptedDarkTheme } =
  adaptNavigationTheme({
    reactNavigationLight: NavigationDefaultTheme,
    reactNavigationDark: NavigationDarkTheme,
  });

/**
 * Hook to get the dynamic Material 3 theme
 *
 * @returns Theme configuration for Paper and Navigation
 */
export function useDynamicTheme() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const accentColor = useAccentColor();

  const { theme: dynamicTheme, updateTheme, resetTheme } = useMaterial3Theme({
    fallbackSourceColor: accentColor ?? SEED_COLOR,
  });

  // Track previous accent color to avoid unnecessary updates
  const prevAccentColorRef = useRef<string | null | undefined>(undefined);

  // Update theme when accent color changes
  useEffect(() => {
    // Skip if accent color hasn't changed
    if (prevAccentColorRef.current === accentColor) {
      return;
    }
    prevAccentColorRef.current = accentColor;

    if (accentColor) {
      updateTheme(accentColor);
    } else {
      resetTheme();
    }
    // updateTheme and resetTheme are not stable references, so we intentionally
    // omit them and use a ref to track changes instead
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accentColor]);

  // Use dynamic colors if available, otherwise fall back to static palette
  const colors = dynamicTheme
    ? isDark
      ? dynamicTheme.dark
      : dynamicTheme.light
    : isDark
      ? M3Colors.dark
      : M3Colors.light;

  // Create Paper theme
  const paperTheme = createPaperTheme(colors as typeof M3Colors.light, isDark);

  // Create Navigation theme
  const navigationTheme = isDark
    ? {
        ...AdaptedDarkTheme,
        colors: {
          ...AdaptedDarkTheme.colors,
          primary: colors.primary,
          background: colors.background,
          card: colors.surfaceContainerHigh,
          text: colors.onSurface,
          border: colors.outlineVariant,
          notification: colors.error,
        },
      }
    : {
        ...AdaptedLightTheme,
        colors: {
          ...AdaptedLightTheme.colors,
          primary: colors.primary,
          background: colors.background,
          card: colors.surfaceContainerHigh,
          text: colors.onSurface,
          border: colors.outlineVariant,
          notification: colors.error,
        },
      };

  return {
    /** Paper theme with M3 colors */
    paperTheme,

    /** Navigation theme adapted for M3 */
    navigationTheme,

    /** Whether dynamic theming is active */
    isDynamic: !!dynamicTheme,

    /** Whether dark mode is active */
    isDark,

    /** Raw M3 colors */
    colors,

    /** Update the dynamic theme source color */
    updateTheme,

    /** Reset to the default seed color */
    resetTheme,
  };
}

/**
 * Get static theme (for use outside of React components)
 */
export function getStaticTheme(isDark: boolean) {
  const colors = isDark ? M3Colors.dark : M3Colors.light;
  return createPaperTheme(colors, isDark);
}
