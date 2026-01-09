/**
 * Icon Component
 *
 * Wrapper for Lucide icons with M3 theming support.
 * Provides consistent sizing and coloring throughout the app.
 */

import React from 'react';
import { StyleSheet, ViewStyle } from 'react-native';
import type { LucideIcon, LucideProps } from 'lucide-react-native';
import { useAppTheme } from '@/lib/theme';

type IconSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | number;

interface IconProps {
  /** The Lucide icon component to render */
  as: LucideIcon;
  /** Icon size (preset or number) */
  size?: IconSize;
  /** Icon color (defaults to onSurface) */
  color?: string;
  /** Stroke width */
  strokeWidth?: number;
  /** Additional style */
  style?: ViewStyle;
  /** Accessibility label */
  accessibilityLabel?: string;
}

/**
 * Map size presets to pixel values
 */
function getSizeValue(size: IconSize): number {
  if (typeof size === 'number') {
    return size;
  }

  switch (size) {
    case 'xs':
      return 16;
    case 'sm':
      return 20;
    case 'md':
      return 24;
    case 'lg':
      return 32;
    case 'xl':
      return 40;
    default:
      return 24;
  }
}

export function Icon({
  as: IconComponent,
  size = 'md',
  color,
  strokeWidth = 2,
  style,
  accessibilityLabel,
}: IconProps) {
  const { colors } = useAppTheme();

  const sizeValue = getSizeValue(size);
  const iconColor = color ?? colors.onSurface;

  return (
    <IconComponent
      size={sizeValue}
      color={iconColor}
      strokeWidth={strokeWidth}
      style={style as LucideProps['style']}
      accessibilityLabel={accessibilityLabel}
    />
  );
}

/**
 * Utility to create a themed icon with preset color
 */
export function createThemedIcon(
  colorKey: 'primary' | 'secondary' | 'error' | 'onSurface' | 'onSurfaceVariant'
) {
  return function ThemedIcon(props: Omit<IconProps, 'color'>) {
    const { colors } = useAppTheme();
    return <Icon {...props} color={colors[colorKey]} />;
  };
}

export type { IconProps, IconSize };
