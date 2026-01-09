/**
 * Text Component
 *
 * M3-compliant text using React Native Paper.
 * Maps previous variant names to M3 typography scale.
 */

import React from 'react';
import { StyleSheet, TextStyle } from 'react-native';
import { Text as PaperText } from 'react-native-paper';
import { useAppTheme } from '@/lib/theme';

/**
 * Legacy variant names mapped to M3 typography
 */
type LegacyVariant =
  | 'default'
  | 'h1'
  | 'h2'
  | 'h3'
  | 'h4'
  | 'p'
  | 'blockquote'
  | 'code'
  | 'lead'
  | 'large'
  | 'small'
  | 'muted';

/**
 * M3 Typography variants from Paper
 */
type M3Variant =
  | 'displayLarge'
  | 'displayMedium'
  | 'displaySmall'
  | 'headlineLarge'
  | 'headlineMedium'
  | 'headlineSmall'
  | 'titleLarge'
  | 'titleMedium'
  | 'titleSmall'
  | 'bodyLarge'
  | 'bodyMedium'
  | 'bodySmall'
  | 'labelLarge'
  | 'labelMedium'
  | 'labelSmall';

type TextVariant = LegacyVariant | M3Variant;

interface TextProps {
  /** Typography variant */
  variant?: TextVariant;
  /** Text content */
  children?: React.ReactNode;
  /** Additional style */
  style?: TextStyle;
  /** Number of lines before truncation */
  numberOfLines?: number;
  /** Ellipsis mode */
  ellipsizeMode?: 'head' | 'middle' | 'tail' | 'clip';
  /** Text alignment */
  align?: 'auto' | 'left' | 'right' | 'center' | 'justify';
  /** Accessibility role */
  accessibilityRole?: 'text' | 'header' | 'link' | 'none';
  /** Selectable text */
  selectable?: boolean;
  /** Press handler (makes text tappable) */
  onPress?: () => void;
}

/**
 * Map legacy variants to M3 Paper variants
 */
function mapVariantToPaper(variant: TextVariant): M3Variant {
  switch (variant) {
    case 'h1':
      return 'displaySmall';
    case 'h2':
      return 'headlineLarge';
    case 'h3':
      return 'headlineMedium';
    case 'h4':
      return 'headlineSmall';
    case 'lead':
      return 'titleLarge';
    case 'large':
      return 'titleMedium';
    case 'p':
    case 'default':
    case 'blockquote':
      return 'bodyLarge';
    case 'small':
    case 'muted':
    case 'code':
      return 'bodySmall';
    // M3 variants pass through
    case 'displayLarge':
    case 'displayMedium':
    case 'displaySmall':
    case 'headlineLarge':
    case 'headlineMedium':
    case 'headlineSmall':
    case 'titleLarge':
    case 'titleMedium':
    case 'titleSmall':
    case 'bodyLarge':
    case 'bodyMedium':
    case 'bodySmall':
    case 'labelLarge':
    case 'labelMedium':
    case 'labelSmall':
      return variant;
    default:
      return 'bodyMedium';
  }
}

/**
 * Get additional styles for specific variants
 */
function getVariantStyles(
  variant: TextVariant,
  colors: ReturnType<typeof useAppTheme>['colors']
): TextStyle {
  switch (variant) {
    case 'h1':
      return { textAlign: 'center', fontWeight: '800' };
    case 'h2':
      return {
        borderBottomWidth: 1,
        borderBottomColor: colors.outlineVariant,
        paddingBottom: 8,
        fontWeight: '600',
      };
    case 'h3':
    case 'h4':
      return { fontWeight: '600' };
    case 'muted':
      return { color: colors.onSurfaceVariant };
    case 'lead':
      return { color: colors.onSurfaceVariant };
    case 'blockquote':
      return {
        fontStyle: 'italic',
        borderLeftWidth: 2,
        borderLeftColor: colors.outlineVariant,
        paddingLeft: 12,
        marginTop: 16,
      };
    case 'code':
      return {
        fontFamily: 'monospace',
        backgroundColor: colors.surfaceVariant,
        paddingHorizontal: 4,
        paddingVertical: 2,
        borderRadius: 4,
        fontWeight: '600',
      };
    default:
      return {};
  }
}

export function Text({
  variant = 'default',
  children,
  style,
  numberOfLines,
  ellipsizeMode,
  align,
  accessibilityRole,
  selectable = false,
  onPress,
}: TextProps) {
  const { colors } = useAppTheme();

  const paperVariant = mapVariantToPaper(variant);
  const variantStyles = getVariantStyles(variant, colors);

  const combinedStyle: TextStyle = {
    ...variantStyles,
    ...(align ? { textAlign: align } : {}),
    ...(style as object),
  };

  return (
    <PaperText
      variant={paperVariant}
      style={combinedStyle}
      numberOfLines={numberOfLines}
      ellipsizeMode={ellipsizeMode}
      accessibilityRole={accessibilityRole}
      selectable={selectable}
      onPress={onPress}
    >
      {children}
    </PaperText>
  );
}

export type { TextProps, TextVariant, M3Variant, LegacyVariant };
