/**
 * ProgressBar Component
 *
 * Seekable progress bar for audio playback.
 * Uses M3 theming.
 */

import { View, LayoutChangeEvent, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { Skeleton } from '@/components/ui/skeleton';
import { usePlayer } from '@/hooks/use-player';
import { Duration } from '@/src/domain/value-objects/duration';
import { useState, useCallback, useRef, useEffect } from 'react';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withRepeat,
  withSequence,
  withTiming,
  cancelAnimation,
  runOnJS,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useAppTheme } from '@/lib/theme';

interface ProgressBarProps {
  seekable?: boolean;
}

const TRACK_HEIGHT = 4;
const THUMB_SIZE = 16;
const HIT_SLOP = 16;

export function ProgressBar({ seekable = true }: ProgressBarProps) {
  const { position, duration, seekTo, isLoading, isBuffering } = usePlayer();
  const { colors } = useAppTheme();
  const [isSeeking, setIsSeeking] = useState(false);
  const [seekPosition, setSeekPosition] = useState(0);
  const [trackWidth, setTrackWidth] = useState(0);
  const thumbScale = useSharedValue(1);
  const thumbOpacity = useSharedValue(1);
  const isDragging = useRef(false);

  useEffect(() => {
    if (isBuffering && !isDragging.current) {
      thumbOpacity.value = withRepeat(
        withSequence(withTiming(0.4, { duration: 500 }), withTiming(1, { duration: 500 })),
        -1,
        false
      );
    } else {
      cancelAnimation(thumbOpacity);
      thumbOpacity.value = withTiming(1, { duration: 200 });
    }
  }, [isBuffering, thumbOpacity]);

  const totalMillis = duration.totalMilliseconds;
  const currentMillis = isSeeking ? seekPosition : position.totalMilliseconds;
  const progress = totalMillis > 0 ? currentMillis / totalMillis : 0;

  const handleLayout = useCallback((event: LayoutChangeEvent) => {
    setTrackWidth(event.nativeEvent.layout.width);
  }, []);

  const updateSeekPosition = useCallback(
    (x: number) => {
      const clampedX = Math.max(0, Math.min(x, trackWidth));
      const newProgress = trackWidth > 0 ? clampedX / trackWidth : 0;
      const newPosition = Math.round(newProgress * totalMillis);
      setSeekPosition(newPosition);
    },
    [trackWidth, totalMillis]
  );

  const startSeeking = useCallback(() => {
    setIsSeeking(true);
    setSeekPosition(position.totalMilliseconds);
  }, [position.totalMilliseconds]);

  const finishSeeking = useCallback(
    async (x: number) => {
      const clampedX = Math.max(0, Math.min(x, trackWidth));
      const newProgress = trackWidth > 0 ? clampedX / trackWidth : 0;
      const newPositionMs = Math.round(newProgress * totalMillis);
      setIsSeeking(false);
      const newPosition = Duration.fromMilliseconds(newPositionMs);
      await seekTo(newPosition);
    },
    [trackWidth, totalMillis, seekTo]
  );

  const isDisabled = !seekable || isLoading || duration.isZero();

  const panGesture = Gesture.Pan()
    .enabled(!isDisabled)
    .onStart((event) => {
      isDragging.current = true;
      thumbScale.value = withSpring(1.5, { damping: 15, stiffness: 400 });
      runOnJS(startSeeking)();
      runOnJS(updateSeekPosition)(event.x);
    })
    .onUpdate((event) => {
      runOnJS(updateSeekPosition)(event.x);
    })
    .onEnd((event) => {
      isDragging.current = false;
      thumbScale.value = withSpring(1, { damping: 15, stiffness: 400 });
      runOnJS(finishSeeking)(event.x);
    });

  const tapGesture = Gesture.Tap()
    .enabled(!isDisabled)
    .onEnd((event) => {
      if (!isDragging.current) {
        runOnJS(finishSeeking)(event.x);
      }
    });

  const composedGesture = Gesture.Race(panGesture, tapGesture);

  const thumbAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: thumbScale.value }],
    opacity: thumbOpacity.value,
  }));

  const currentTime = isSeeking
    ? Duration.fromMilliseconds(seekPosition).format()
    : position.format();
  const totalTime = duration.format();

  return (
    <View style={styles.container}>
      {/* Progress track */}
      <GestureDetector gesture={composedGesture}>
        <View
          onLayout={handleLayout}
          style={styles.trackContainer}
        >
          {/* Background track */}
          <View
            style={[
              styles.track,
              { backgroundColor: colors.surfaceContainerHighest },
            ]}
          >
            {/* Progress fill */}
            <View
              style={[
                styles.trackFill,
                {
                  backgroundColor: colors.primary,
                  width: `${progress * 100}%`,
                },
              ]}
            />
          </View>

          {/* Thumb */}
          <Animated.View
            style={[
              thumbAnimatedStyle,
              styles.thumb,
              {
                left: progress * trackWidth - THUMB_SIZE / 2,
                backgroundColor: colors.primary,
              },
              isDisabled && styles.thumbDisabled,
            ]}
          />
        </View>
      </GestureDetector>

      {/* Time labels */}
      <View style={styles.timeContainer}>
        {isLoading ? (
          <Skeleton width={32} height={14} rounded="sm" />
        ) : (
          <Text
            variant="bodySmall"
            style={[styles.timeText, { color: colors.onSurfaceVariant }]}
          >
            {currentTime}
          </Text>
        )}
        {isLoading ? (
          <Skeleton width={32} height={14} rounded="sm" />
        ) : (
          <Text
            variant="bodySmall"
            style={[styles.timeText, { color: colors.onSurfaceVariant }]}
          >
            {totalTime}
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    gap: 12,
  },
  trackContainer: {
    width: '100%',
    justifyContent: 'center',
    height: THUMB_SIZE + HIT_SLOP * 2,
    paddingVertical: HIT_SLOP,
  },
  track: {
    width: '100%',
    height: TRACK_HEIGHT,
    borderRadius: TRACK_HEIGHT / 2,
  },
  trackFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: TRACK_HEIGHT / 2,
  },
  thumb: {
    position: 'absolute',
    top: (THUMB_SIZE + HIT_SLOP * 2) / 2 - THUMB_SIZE / 2,
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
  },
  thumbDisabled: {
    opacity: 0.5,
  },
  timeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timeText: {
    fontVariant: ['tabular-nums'],
  },
});
