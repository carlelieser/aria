/**
 * FloatingProgressBar Component
 *
 * Thin progress bar for the floating mini player.
 * Uses M3 theming.
 */

import { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { usePlaybackProgress } from '@/src/application/state/player-store';
import { useAppTheme } from '@/lib/theme';

const TRACK_HEIGHT = 3;
const ANIMATION_DURATION_MS = 100;

export function FloatingProgressBar() {
  const { percentage } = usePlaybackProgress();
  const { colors } = useAppTheme();
  const animatedPercentage = useSharedValue(percentage);

  useEffect(() => {
    animatedPercentage.value = withTiming(percentage, {
      duration: ANIMATION_DURATION_MS,
      easing: Easing.linear,
    });
  }, [percentage, animatedPercentage]);

  const animatedStyle = useAnimatedStyle(() => ({
    width: `${animatedPercentage.value}%`,
  }));

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.surfaceContainerHighest },
      ]}
    >
      <Animated.View
        style={[
          styles.progress,
          { backgroundColor: colors.primary },
          animatedStyle,
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: TRACK_HEIGHT,
    borderRadius: TRACK_HEIGHT / 2,
    overflow: 'hidden',
  },
  progress: {
    height: '100%',
    borderRadius: TRACK_HEIGHT / 2,
  },
});
