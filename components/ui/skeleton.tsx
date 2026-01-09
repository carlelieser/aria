/**
 * Skeleton Component
 *
 * Loading placeholder with shimmer animation using M3 theming.
 */

import React, { useEffect, useState } from 'react';
import { View, ViewStyle, LayoutChangeEvent, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { useAppTheme } from '@/lib/theme';
import { M3Shapes } from '@/lib/theme';

type RoundedSize = 'none' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';

interface SkeletonProps {
  /** Width of the skeleton */
  width?: number | `${number}%`;
  /** Height of the skeleton */
  height?: number;
  /** Border radius preset */
  rounded?: RoundedSize;
  /** Enable shimmer animation */
  shimmer?: boolean;
  /** Animation duration in ms */
  duration?: number;
  /** Additional style */
  style?: ViewStyle;
}

/**
 * Map rounded presets to pixel values
 */
function getRoundedValue(rounded: RoundedSize): number {
  switch (rounded) {
    case 'none':
      return 0;
    case 'sm':
      return M3Shapes.extraSmall;
    case 'md':
      return M3Shapes.small;
    case 'lg':
      return M3Shapes.medium;
    case 'xl':
      return M3Shapes.large;
    case '2xl':
      return M3Shapes.extraLarge;
    case 'full':
      return M3Shapes.full;
    default:
      return M3Shapes.small;
  }
}

export function Skeleton({
  width,
  height,
  rounded = 'md',
  shimmer = true,
  duration = 1500,
  style,
}: SkeletonProps) {
  const { colors, isDark } = useAppTheme();
  const [layoutWidth, setLayoutWidth] = useState(0);
  const translateX = useSharedValue(-layoutWidth);

  const handleLayout = (event: LayoutChangeEvent) => {
    const measuredWidth = event.nativeEvent.layout.width;
    setLayoutWidth(measuredWidth);
    translateX.value = -measuredWidth;
  };

  useEffect(() => {
    if (shimmer && layoutWidth > 0) {
      translateX.value = -layoutWidth;
      translateX.value = withRepeat(
        withTiming(layoutWidth * 2, {
          duration,
          easing: Easing.linear,
        }),
        -1,
        false
      );
    }
  }, [shimmer, layoutWidth, duration, translateX]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const borderRadius = getRoundedValue(rounded);
  const backgroundColor = colors.surfaceContainerHighest;

  // Shimmer gradient colors
  const shimmerColors: [string, string, string] = isDark
    ? ['transparent', 'rgba(255,255,255,0.08)', 'transparent']
    : ['transparent', 'rgba(255,255,255,0.4)', 'transparent'];

  const dimensionStyle: ViewStyle = {
    ...(width !== undefined && { width }),
    ...(height !== undefined && { height }),
  };

  return (
    <View
      style={[
        styles.container,
        { backgroundColor, borderRadius },
        dimensionStyle,
        style,
      ]}
      onLayout={handleLayout}
    >
      {shimmer && layoutWidth > 0 && (
        <Animated.View style={[StyleSheet.absoluteFill, animatedStyle]} pointerEvents="none">
          <LinearGradient
            colors={shimmerColors}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={[styles.shimmer, { width: layoutWidth * 0.6 }]}
          />
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
  shimmer: {
    flex: 1,
  },
});

export type { SkeletonProps, RoundedSize };
