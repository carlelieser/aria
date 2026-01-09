/**
 * Material 3 Typography Scale
 *
 * The type scale is a selection of font styles that can be used across an app,
 * ensuring a consistent and purposeful use of type.
 */

import { Platform, TextStyle } from 'react-native';

const getFontFamily = (): string => {
  if (Platform.OS === 'ios') {
    return 'System';
  }
  if (Platform.OS === 'android') {
    return 'Roboto';
  }
  return 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
};

const baseFontFamily = getFontFamily();

export const M3Typography = {
  // Display styles - Hero text, very large text
  displayLarge: {
    fontFamily: baseFontFamily,
    fontSize: 57,
    lineHeight: 64,
    fontWeight: '400' as TextStyle['fontWeight'],
    letterSpacing: -0.25,
  },
  displayMedium: {
    fontFamily: baseFontFamily,
    fontSize: 45,
    lineHeight: 52,
    fontWeight: '400' as TextStyle['fontWeight'],
    letterSpacing: 0,
  },
  displaySmall: {
    fontFamily: baseFontFamily,
    fontSize: 36,
    lineHeight: 44,
    fontWeight: '400' as TextStyle['fontWeight'],
    letterSpacing: 0,
  },

  // Headline styles - High-emphasis text
  headlineLarge: {
    fontFamily: baseFontFamily,
    fontSize: 32,
    lineHeight: 40,
    fontWeight: '400' as TextStyle['fontWeight'],
    letterSpacing: 0,
  },
  headlineMedium: {
    fontFamily: baseFontFamily,
    fontSize: 28,
    lineHeight: 36,
    fontWeight: '400' as TextStyle['fontWeight'],
    letterSpacing: 0,
  },
  headlineSmall: {
    fontFamily: baseFontFamily,
    fontSize: 24,
    lineHeight: 32,
    fontWeight: '400' as TextStyle['fontWeight'],
    letterSpacing: 0,
  },

  // Title styles - Medium-emphasis text
  titleLarge: {
    fontFamily: baseFontFamily,
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '400' as TextStyle['fontWeight'],
    letterSpacing: 0,
  },
  titleMedium: {
    fontFamily: baseFontFamily,
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '500' as TextStyle['fontWeight'],
    letterSpacing: 0.15,
  },
  titleSmall: {
    fontFamily: baseFontFamily,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500' as TextStyle['fontWeight'],
    letterSpacing: 0.1,
  },

  // Body styles - Paragraph text
  bodyLarge: {
    fontFamily: baseFontFamily,
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '400' as TextStyle['fontWeight'],
    letterSpacing: 0.5,
  },
  bodyMedium: {
    fontFamily: baseFontFamily,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '400' as TextStyle['fontWeight'],
    letterSpacing: 0.25,
  },
  bodySmall: {
    fontFamily: baseFontFamily,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '400' as TextStyle['fontWeight'],
    letterSpacing: 0.4,
  },

  // Label styles - Utility text, buttons, tabs
  labelLarge: {
    fontFamily: baseFontFamily,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500' as TextStyle['fontWeight'],
    letterSpacing: 0.1,
  },
  labelMedium: {
    fontFamily: baseFontFamily,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '500' as TextStyle['fontWeight'],
    letterSpacing: 0.5,
  },
  labelSmall: {
    fontFamily: baseFontFamily,
    fontSize: 11,
    lineHeight: 16,
    fontWeight: '500' as TextStyle['fontWeight'],
    letterSpacing: 0.5,
  },
} as const;

export type M3TypographyVariant = keyof typeof M3Typography;
