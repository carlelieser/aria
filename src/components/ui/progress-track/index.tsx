/**
 * ProgressTrack Component
 *
 * Generic presentational progress track supporting three visual styles:
 * expressive (wavy), expressive-variant (thick caret), and basic (linear).
 * No player/store dependencies -- colors and state are injected via props.
 */

import { memo, useEffect } from 'react';
import { View } from 'react-native';
import { Text } from 'react-native-paper';
import Animated, { useSharedValue } from 'react-native-reanimated';
import { GestureDetector } from 'react-native-gesture-handler';
import type { ProgressTrackProps } from './types';
import {
	THUMB_SIZE,
	TRACK_HEIGHT,
	GAP_SIZE,
	INACTIVE_INSET,
	STOP_GAP,
	STOP_RADIUS,
	BASIC_THUMB_SIZE,
	VARIANT_HANDLE_WIDTH,
} from './types';
import {
	useWaveAnimation,
	useAmplitude,
	useWaveAnimatedProps,
	useTrackLayout,
	useSeekGesture,
} from './hooks';
import { renderTrack } from './track-renderer';
import { styles } from './styles';

export type { ProgressTrackProps } from './types';

export const ProgressTrack = memo(function ProgressTrack({
	variant,
	progress,
	colors,
	animated = false,
	interactive = false,
	onSeek,
	showTimeLabels = false,
	currentTime,
	totalTime,
	disabled = false,
}: ProgressTrackProps) {
	const { trackWidth, handleLayout } = useTrackLayout();
	const isBasic = variant === 'basic';
	const isVariant = variant === 'expressive-variant';
	const shouldAnimate = animated && !isBasic;
	const isDisabled = disabled || !interactive;

	const { localProgress, composedGesture, thumbAnimatedStyle } = useSeekGesture(
		trackWidth,
		isDisabled,
		onSeek
	);

	// Keep a shared value in sync with the JS progress prop so the wave worklet
	// can read the latest value without needing a new closure on every tick.
	const progressSv = useSharedValue(progress);
	useEffect(() => {
		progressSv.value = progress;
	}, [progressSv, progress]);

	const displayProgress = localProgress ?? progress;
	const activeEnd = displayProgress * trackWidth;
	const activeWidth = Math.max(0, activeEnd);

	// Shared value for activeWidth keeps the useAnimatedProps closure stable
	// across progress ticks — only the shared value is updated, not the closure.
	const activeWidthSv = useSharedValue(activeWidth);
	useEffect(() => {
		activeWidthSv.value = activeWidth;
	}, [activeWidthSv, activeWidth]);

	const phase = useWaveAnimation(shouldAnimate);
	const animatedAmplitude = useAmplitude(progressSv, shouldAnimate);
	const waveAnimatedProps = useWaveAnimatedProps(activeWidthSv, animatedAmplitude, phase);

	const cy = TRACK_HEIGHT / 2;
	const inactiveStart = activeEnd + GAP_SIZE + INACTIVE_INSET;
	const stopCx = trackWidth - STOP_GAP - STOP_RADIUS;
	const inactiveEnd = stopCx - STOP_GAP;

	const thumbOffset = computeThumbOffset(activeEnd, isBasic, isVariant);

	const trackContent = (
		<View onLayout={handleLayout} style={styles.trackContainer}>
			{trackWidth > 0 &&
				renderTrack(variant, {
					trackWidth,
					activeWidth,
					activeEnd,
					cy,
					inactiveStart,
					inactiveEnd,
					stopCx,
					colors,
					waveAnimatedProps,
				})}

			<Animated.View
				style={[
					thumbAnimatedStyle,
					isBasic ? styles.basicThumb : isVariant ? styles.variantThumb : styles.thumb,
					{ left: thumbOffset, backgroundColor: colors.primary },
				]}
			/>
		</View>
	);

	return (
		<View style={styles.container}>
			{interactive ? (
				<GestureDetector gesture={composedGesture}>{trackContent}</GestureDetector>
			) : (
				trackContent
			)}

			{showTimeLabels && (
				<View style={styles.timeContainer}>
					<Text
						variant={'bodySmall'}
						style={[styles.timeText, { color: colors.onSurfaceVariant }]}
					>
						{currentTime ?? '0:00'}
					</Text>
					<Text
						variant={'bodySmall'}
						style={[styles.timeText, { color: colors.onSurfaceVariant }]}
					>
						{totalTime ?? '0:00'}
					</Text>
				</View>
			)}
		</View>
	);
});

function computeThumbOffset(activeEnd: number, isBasic: boolean, isVariant: boolean): number {
	if (isBasic) return activeEnd - BASIC_THUMB_SIZE / 2;
	if (isVariant) return activeEnd - VARIANT_HANDLE_WIDTH / 2;
	return activeEnd - THUMB_SIZE / 2;
}
