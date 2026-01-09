/**
 * DownloadIndicator Component
 *
 * Shows download status indicator on track artwork.
 * Uses M3 theming.
 */

import { memo, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSpring,
  Easing,
} from 'react-native-reanimated';
import { AlertCircle, ArrowDown } from 'lucide-react-native';
import { Icon } from '@/components/ui/icon';
import { useDownloadStatus } from '@/hooks/use-download-status';
import { useAppTheme } from '@/lib/theme';

interface DownloadIndicatorProps {
  trackId: string;
  size?: 'sm' | 'md' | 'lg';
}

const SIZE_CONFIG = {
  sm: { container: 16, icon: 10, offset: -2 },
  md: { container: 20, icon: 12, offset: -4 },
  lg: { container: 24, icon: 14, offset: -6 },
};

export const DownloadIndicator = memo(function DownloadIndicator({
  trackId,
  size = 'sm',
}: DownloadIndicatorProps) {
  const { isDownloaded, isDownloading, status, progress } = useDownloadStatus(trackId);
  const { colors } = useAppTheme();

  const rotation = useSharedValue(0);
  const scale = useSharedValue(0);
  const opacity = useSharedValue(0);

  const config = SIZE_CONFIG[size];

  useEffect(() => {
    if (isDownloading) {
      rotation.value = withRepeat(
        withTiming(360, { duration: 1500, easing: Easing.linear }),
        -1,
        false
      );
      scale.value = withSpring(1, { damping: 15, stiffness: 300 });
      opacity.value = withTiming(1, { duration: 200 });
    } else if (isDownloaded || status === 'failed') {
      rotation.value = 0;
      scale.value = withSpring(1, { damping: 15, stiffness: 300 });
      opacity.value = withTiming(1, { duration: 200 });
    } else {
      scale.value = withSpring(0, { damping: 15, stiffness: 300 });
      opacity.value = withTiming(0, { duration: 200 });
    }
  }, [isDownloading, isDownloaded, status, rotation, scale, opacity]);

  const animatedContainerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const animatedIconStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  if (!isDownloaded && !isDownloading && status !== 'failed') {
    return null;
  }

  const getBackgroundColor = () => {
    if (status === 'failed') return colors.error;
    if (isDownloading) return colors.primary;
    if (isDownloaded) return colors.primary;
    return colors.primary;
  };

  const getIconColor = () => {
    if (status === 'failed') return colors.onError;
    if (isDownloading) return colors.onPrimary;
    if (isDownloaded) return colors.onPrimary;
    return colors.onPrimary;
  };

  const renderIcon = () => {
    if (isDownloading) {
      return (
        <Animated.View style={animatedIconStyle}>
          <Icon as={ArrowDown} size={config.icon} color={getIconColor()} />
        </Animated.View>
      );
    }

    if (status === 'failed') {
      return <Icon as={AlertCircle} size={config.icon} color={getIconColor()} />;
    }

    if (isDownloaded) {
      return <Icon as={ArrowDown} size={config.icon} color={getIconColor()} />;
    }

    return null;
  };

  return (
    <Animated.View
      style={[
        animatedContainerStyle,
        styles.container,
        {
          bottom: config.offset,
          right: config.offset,
          width: config.container,
          height: config.container,
          borderRadius: config.container / 2,
          backgroundColor: getBackgroundColor(),
          borderColor: colors.background,
        },
      ]}
    >
      {isDownloading && progress > 0 && progress < 100 && (
        <View
          style={[
            styles.progressOverlay,
            {
              width: `${progress}%`,
              borderRadius: config.container / 2,
            },
          ]}
        />
      )}
      {renderIcon()}
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  progressOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
});
