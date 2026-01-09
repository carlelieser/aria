/**
 * DownloadProgressBar Component
 *
 * Progress bar for download status. Uses M3 theming.
 */

import { memo, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { useDownloadStatus } from '@/hooks/use-download-status';
import { useAppTheme } from '@/lib/theme';

interface DownloadProgressBarProps {
  trackId: string;
  height?: number;
  showOnlyWhenDownloading?: boolean;
}

export const DownloadProgressBar = memo(function DownloadProgressBar({
  trackId,
  height = 2,
  showOnlyWhenDownloading = true,
}: DownloadProgressBarProps) {
  const { isDownloading, progress, status } = useDownloadStatus(trackId);
  const { colors } = useAppTheme();

  const animatedProgress = useSharedValue(0);
  const containerOpacity = useSharedValue(0);

  useEffect(() => {
    animatedProgress.value = withTiming(progress, {
      duration: 300,
      easing: Easing.out(Easing.ease),
    });
  }, [progress, animatedProgress]);

  useEffect(() => {
    if (isDownloading) {
      containerOpacity.value = withTiming(1, { duration: 200 });
    } else if (showOnlyWhenDownloading) {
      containerOpacity.value = withTiming(0, { duration: 200 });
    } else if (status === 'completed') {
      containerOpacity.value = withTiming(1, { duration: 200 });
    } else {
      containerOpacity.value = withTiming(0, { duration: 200 });
    }
  }, [isDownloading, showOnlyWhenDownloading, status, containerOpacity]);

  const progressStyle = useAnimatedStyle(() => ({
    width: `${animatedProgress.value}%`,
  }));

  const containerStyle = useAnimatedStyle(() => ({
    opacity: containerOpacity.value,
  }));

  if (showOnlyWhenDownloading && !isDownloading) {
    return null;
  }

  const getProgressColor = () => {
    if (status === 'failed') return colors.error;
    if (status === 'completed') return colors.primary;
    return colors.primary;
  };

  return (
    <Animated.View
      style={[
        containerStyle,
        styles.container,
        {
          height,
          backgroundColor: colors.surfaceContainerHighest,
        },
      ]}
    >
      <Animated.View
        style={[
          progressStyle,
          styles.progress,
          {
            height,
            backgroundColor: getProgressColor(),
          },
        ]}
      />
    </Animated.View>
  );
});

interface StaticProgressBarProps {
  progress: number;
  height?: number;
  status?: 'downloading' | 'completed' | 'failed' | 'pending';
}

export const StaticProgressBar = memo(function StaticProgressBar({
  progress,
  height = 2,
  status = 'downloading',
}: StaticProgressBarProps) {
  const { colors } = useAppTheme();

  const getProgressColor = () => {
    if (status === 'failed') return colors.error;
    if (status === 'completed') return colors.primary;
    return colors.primary;
  };

  return (
    <View
      style={[
        styles.container,
        {
          height,
          backgroundColor: colors.surfaceContainerHighest,
        },
      ]}
    >
      <View
        style={[
          styles.progress,
          {
            height,
            width: `${progress}%`,
            backgroundColor: getProgressColor(),
          },
        ]}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    width: '100%',
    borderRadius: 9999,
    overflow: 'hidden',
  },
  progress: {
    borderRadius: 9999,
  },
});
