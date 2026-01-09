import { View, LayoutChangeEvent } from 'react-native';
import { Text } from '@/components/ui/text';
import { Skeleton } from '@/components/ui/skeleton';
import { usePlayer } from '@/hooks/use-player';
import { Duration } from '@/src/domain/value-objects/duration';
import { useState, useCallback, useRef } from 'react';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

interface ProgressBarProps {
  seekable?: boolean;
}

const TRACK_HEIGHT = 4;
const THUMB_SIZE = 16;
const HIT_SLOP = 16;

export function ProgressBar({ seekable = true }: ProgressBarProps) {
  const { position, duration, seekTo, isLoading } = usePlayer();
  const [isSeeking, setIsSeeking] = useState(false);
  const [seekPosition, setSeekPosition] = useState(0);
  const [trackWidth, setTrackWidth] = useState(0);
  const thumbScale = useSharedValue(1);
  const isDragging = useRef(false);

  const totalMillis = duration.totalMilliseconds;
  const currentMillis = isSeeking ? seekPosition : position.totalMilliseconds;
  const progress = totalMillis > 0 ? currentMillis / totalMillis : 0;

  const handleLayout = useCallback((event: LayoutChangeEvent) => {
    setTrackWidth(event.nativeEvent.layout.width);
  }, []);

  const updateSeekPosition = useCallback((x: number) => {
    const clampedX = Math.max(0, Math.min(x, trackWidth));
    const newProgress = trackWidth > 0 ? clampedX / trackWidth : 0;
    const newPosition = Math.round(newProgress * totalMillis);
    setSeekPosition(newPosition);
  }, [trackWidth, totalMillis]);

  const startSeeking = useCallback(() => {
    setIsSeeking(true);
    setSeekPosition(position.totalMilliseconds);
  }, [position.totalMilliseconds]);

  const finishSeeking = useCallback(async (x: number) => {
    const clampedX = Math.max(0, Math.min(x, trackWidth));
    const newProgress = trackWidth > 0 ? clampedX / trackWidth : 0;
    const newPositionMs = Math.round(newProgress * totalMillis);
    setIsSeeking(false);
    const newPosition = Duration.fromMilliseconds(newPositionMs);
    await seekTo(newPosition);
  }, [trackWidth, totalMillis, seekTo]);

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
  }));

  const currentTime = isSeeking
    ? Duration.fromMilliseconds(seekPosition).format()
    : position.format();
  const totalTime = duration.format();

  return (
    <View className="w-full gap-3">
      {/* Custom slider */}
      <GestureDetector gesture={composedGesture}>
        <View
          onLayout={handleLayout}
          className="w-full justify-center"
          style={{ height: THUMB_SIZE + HIT_SLOP * 2, paddingVertical: HIT_SLOP }}
        >
          {/* Track background */}
          <View
            className="w-full rounded-full bg-muted/30"
            style={{ height: TRACK_HEIGHT }}
          >
            {/* Progress fill */}
            <View
              className="absolute left-0 top-0 bottom-0 rounded-full bg-foreground"
              style={{ width: `${progress * 100}%` }}
            />
          </View>

          {/* Thumb - centered vertically in container */}
          <Animated.View
            style={[
              thumbAnimatedStyle,
              {
                position: 'absolute',
                left: progress * trackWidth - THUMB_SIZE / 2,
                top: (THUMB_SIZE + HIT_SLOP * 2) / 2 - THUMB_SIZE / 2,
                width: THUMB_SIZE,
                height: THUMB_SIZE,
                borderRadius: THUMB_SIZE / 2,
                backgroundColor: 'white',
                opacity: isDisabled ? 0.5 : 1,
              },
            ]}
          />
        </View>
      </GestureDetector>

      {/* Time labels */}
      <View className="flex-row justify-between items-center">
        {isLoading ? (
          <Skeleton width={32} height={14} rounded="sm" />
        ) : (
          <Text variant="muted" className="text-xs font-medium" style={{ fontVariant: ['tabular-nums'] }}>
            {currentTime}
          </Text>
        )}
        {isLoading ? (
          <Skeleton width={32} height={14} rounded="sm" />
        ) : (
          <Text variant="muted" className="text-xs font-medium" style={{ fontVariant: ['tabular-nums'] }}>
            {totalTime}
          </Text>
        )}
      </View>
    </View>
  );
}
