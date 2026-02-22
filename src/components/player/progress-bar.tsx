/**
 * ProgressBar Component
 *
 * Seekable progress bar for audio playback.
 * Uses M3 Expressive wavy active indicator with SVG + Reanimated.
 */

import { View, LayoutChangeEvent, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { Skeleton } from '@/src/components/ui/skeleton';
import { usePlayer } from '@/src/hooks/use-player';
import { Duration } from '@/src/domain/value-objects/duration';
import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import Animated, {
	useSharedValue,
	useAnimatedStyle,
	useAnimatedProps,
	withSpring,
	withRepeat,
	withSequence,
	withTiming,
	cancelAnimation,
	runOnJS,
	Easing,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Svg, { Path, Line, Circle } from 'react-native-svg';
import { useAppTheme } from '@/lib/theme';

const AnimatedPath = Animated.createAnimatedComponent(Path);

interface ProgressBarProps {
	seekable?: boolean;
}

/**
 * M3 Expressive determinate progress indicator tokens (from spec diagram).
 *
 * Layout (left to right):
 *   [wavy active] [4dp gap] [8dp inset] [inactive track] ... [4dp gap] [stop 4x4]
 *
 * Container height: 14dp
 * Wave amplitude: 4dp (center-of-stroke deviation)
 * Wavelength: 40dp
 */
const ACTIVE_THICKNESS = 4;
const TRACK_THICKNESS = 4;
const WAVE_AMPLITUDE = 4;
const WAVELENGTH = 40;
const TRACK_HEIGHT = 14;
const GAP_SIZE = 4;
const INACTIVE_INSET = 12;
const STOP_DIAMETER = 4;
const STOP_RADIUS = STOP_DIAMETER / 2;
const STOP_GAP = 4;

const THUMB_SIZE = 24;
const HIT_SLOP = 16;

const CAP_INSET = ACTIVE_THICKNESS / 2;
const WAVE_STEP = 2;
const TWO_PI_OVER_WAVELENGTH = (2 * Math.PI) / WAVELENGTH;

/**
 * Builds a sine-wave polyline path from capInset to width-capInset.
 * Phase shifts the wave pattern. strokeLinecap="round" on the Path
 * naturally rounds both endpoints.
 */
function buildAnimatedWavePath(width: number, amp: number, phaseValue: number): string {
	'worklet';
	const cy = TRACK_HEIGHT / 2;
	const startX = CAP_INSET;
	const endX = width - CAP_INSET;

	if (endX <= startX) {
		return `M ${startX} ${cy} L ${startX} ${cy}`;
	}

	const startY = cy + amp * Math.sin(TWO_PI_OVER_WAVELENGTH * (startX - phaseValue));
	let d = `M ${startX.toFixed(1)} ${startY.toFixed(1)}`;

	for (let x = startX + WAVE_STEP; x < endX; x += WAVE_STEP) {
		const y = cy + amp * Math.sin(TWO_PI_OVER_WAVELENGTH * (x - phaseValue));
		d += ` L ${x.toFixed(1)} ${y.toFixed(1)}`;
	}

	const endY = cy + amp * Math.sin(TWO_PI_OVER_WAVELENGTH * (endX - phaseValue));
	d += ` L ${endX.toFixed(1)} ${endY.toFixed(1)}`;

	return d;
}

export function ProgressBar({ seekable = true }: ProgressBarProps) {
	const { position, duration, seekTo, isLoading, isBuffering, isPlaying } = usePlayer();
	const { colors } = useAppTheme();
	const [isSeeking, setIsSeeking] = useState(false);
	const [seekPosition, setSeekPosition] = useState(0);
	const [trackWidth, setTrackWidth] = useState(0);
	const thumbScale = useSharedValue(1);
	const thumbOpacity = useSharedValue(1);
	const isDragging = useRef(false);

	// Wave phase animation: only runs when animated prop is true AND track is playing
	const phase = useSharedValue(0);
	const shouldAnimate = isPlaying;

	useEffect(() => {
		if (shouldAnimate) {
			phase.value = withRepeat(
				withTiming(phase.value + WAVELENGTH, { duration: 2500, easing: Easing.linear }),
				-1,
				false
			);
		} else {
			cancelAnimation(phase);
		}
		return () => cancelAnimation(phase);
	}, [phase, shouldAnimate]);

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

	// Amplitude: flat when not playing, and near 0% / 100% progress
	const targetAmplitude = useMemo(() => {
		if (!shouldAnimate) return 0;
		if (progress < 0.1) return progress / 0.1;
		if (progress > 0.95) return (1 - progress) / 0.05;
		return 1;
	}, [progress, shouldAnimate]);

	const animatedAmplitude = useSharedValue(0);

	useEffect(() => {
		animatedAmplitude.value = withTiming(targetAmplitude * WAVE_AMPLITUDE, { duration: 300 });
	}, [targetAmplitude, animatedAmplitude]);

	const activeEnd = progress * trackWidth;
	const cy = TRACK_HEIGHT / 2;
	const activeWidth = Math.max(0, activeEnd);

	// Animated wave path: phase and amplitude drive animation on the UI thread,
	// activeWidth updates on re-render via closure capture.
	const waveAnimatedProps = useAnimatedProps(() => {
		return {
			d: buildAnimatedWavePath(activeWidth, animatedAmplitude.value, phase.value),
		};
	});

	// Inactive track: starts INACTIVE_INSET after the GAP
	const inactiveStart = activeEnd + GAP_SIZE + INACTIVE_INSET;

	// Stop indicator positioned STOP_GAP from the right edge
	const stopCx = trackWidth - STOP_GAP - STOP_RADIUS;

	// Inactive track ends STOP_GAP before stop indicator
	const inactiveEnd = stopCx - STOP_GAP;

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
				<View onLayout={handleLayout} style={styles.trackContainer}>
					{trackWidth > 0 && (
						<Svg width={trackWidth} height={TRACK_HEIGHT} style={styles.trackSvg}>
							{/* Inactive track */}
							{inactiveStart < inactiveEnd && (
								<Line
									x1={inactiveStart}
									y1={cy}
									x2={inactiveEnd}
									y2={cy}
									stroke={colors.primaryContainer}
									strokeWidth={TRACK_THICKNESS}
									strokeLinecap={'round'}
								/>
							)}

							{/* Stop indicator */}
							<Circle cx={stopCx} cy={cy} r={STOP_RADIUS} fill={colors.primary} />

							{/* Active indicator: animated wave */}
							{activeWidth > ACTIVE_THICKNESS && (
								<AnimatedPath
									animatedProps={waveAnimatedProps}
									stroke={colors.primary}
									strokeWidth={ACTIVE_THICKNESS}
									strokeLinecap={'round'}
									fill={'none'}
								/>
							)}
						</Svg>
					)}

					{/* Thumb */}
					<Animated.View
						style={[
							thumbAnimatedStyle,
							styles.thumb,
							{
								left: activeEnd - THUMB_SIZE / 2,
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
					<Skeleton width={32} height={14} rounded={'sm'} />
				) : (
					<Text
						variant={'bodySmall'}
						style={[styles.timeText, { color: colors.onSurfaceVariant }]}
					>
						{currentTime}
					</Text>
				)}
				{isLoading ? (
					<Skeleton width={32} height={14} rounded={'sm'} />
				) : (
					<Text
						variant={'bodySmall'}
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
	trackSvg: {
		position: 'absolute',
		top: HIT_SLOP + (THUMB_SIZE - TRACK_HEIGHT) / 2,
		left: 0,
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
