/**
 * ProgressBar Component
 *
 * Seekable progress bar for audio playback.
 * Supports three style variants: expressive (wavy), expressive-variant (thick caret),
 * and basic (linear). Uses PlayerThemeContext for colors.
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
import Svg, { Path, Line, Circle, Rect } from 'react-native-svg';
import { usePlayerTheme } from '@/src/components/player/player-theme-context';
import { useProgressBarStyle } from '@/src/application/state/settings-store';
import type { ProgressBarStyle } from '@/src/application/state/settings-store';

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

/** Expressive variant tokens (M3 Expressive slider L) */
const VARIANT_TRACK_HEIGHT = 56;
const VARIANT_TRACK_RADIUS = 16;
const VARIANT_HANDLE_WIDTH = 4;
const VARIANT_HANDLE_HEIGHT = 68;
const VARIANT_HANDLE_RADIUS = 2;

/** Basic style tokens */
const BASIC_TRACK_THICKNESS = 4;
const BASIC_THUMB_SIZE = 16;
const BASIC_TRACK_HEIGHT = BASIC_TRACK_THICKNESS;

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

/**
 * Builds a rect path with rounded left corners and flat right edge
 * so the active track connects flush with the caret handle.
 */
function buildVariantActiveTrackPath(width: number, height: number, radius: number): string {
	const r = Math.min(radius, width, height / 2);
	return [
		`M ${r} 0`,
		`L ${width} 0`,
		`L ${width} ${height}`,
		`L ${r} ${height}`,
		`A ${r} ${r} 0 0 1 0 ${height - r}`,
		`L 0 ${r}`,
		`A ${r} ${r} 0 0 1 ${r} 0`,
		'Z',
	].join(' ');
}

export function ProgressBar({ seekable = true }: ProgressBarProps) {
	const { position, duration, seekTo, isLoading, isBuffering, isPlaying } = usePlayer();
	const { colors } = usePlayerTheme();
	const barStyle = useProgressBarStyle();
	const [isSeeking, setIsSeeking] = useState(false);
	const [seekPosition, setSeekPosition] = useState(0);
	const [trackWidth, setTrackWidth] = useState(0);
	const thumbScale = useSharedValue(1);
	const thumbOpacity = useSharedValue(1);
	const isDragging = useRef(false);

	const isBasic = barStyle === 'basic';
	const isVariant = barStyle === 'expressive-variant';

	// Wave phase animation: only runs when not basic AND track is playing
	const phase = useSharedValue(0);
	const shouldAnimate = isPlaying && !isBasic;

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
	const activeWidth = Math.max(0, activeEnd);

	// Animated wave path for expressive style only
	const waveAnimatedProps = useAnimatedProps(() => {
		return {
			d: buildAnimatedWavePath(activeWidth, animatedAmplitude.value, phase.value),
		};
	});

	const cy = TRACK_HEIGHT / 2;

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
					{trackWidth > 0 &&
						renderTrack(barStyle, {
							trackWidth,
							activeWidth,
							activeEnd,
							cy,
							inactiveStart,
							inactiveEnd,
							stopCx,
							colors,
							waveAnimatedProps,
							isDisabled,
						})}

					{/* Thumb */}
					<Animated.View
						style={[
							thumbAnimatedStyle,
							isBasic
								? styles.basicThumb
								: isVariant
									? styles.variantThumb
									: styles.thumb,
							{
								left:
									activeEnd -
									(isBasic
										? BASIC_THUMB_SIZE / 2
										: isVariant
											? VARIANT_HANDLE_WIDTH / 2
											: THUMB_SIZE / 2),
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

interface TrackRenderParams {
	readonly trackWidth: number;
	readonly activeWidth: number;
	readonly activeEnd: number;
	readonly cy: number;
	readonly inactiveStart: number;
	readonly inactiveEnd: number;
	readonly stopCx: number;
	readonly colors: {
		readonly primary: string;
		readonly primaryContainer: string;
		readonly onSurfaceVariant: string;
	};
	readonly waveAnimatedProps: ReturnType<typeof useAnimatedProps>;
	readonly isDisabled: boolean;
}

function renderTrack(style: ProgressBarStyle, params: TrackRenderParams) {
	const {
		trackWidth,
		activeWidth,
		activeEnd,
		cy,
		inactiveStart,
		inactiveEnd,
		stopCx,
		colors,
		waveAnimatedProps,
	} = params;

	if (style === 'basic') {
		const basicCy = BASIC_TRACK_HEIGHT / 2;
		return (
			<Svg width={trackWidth} height={BASIC_TRACK_HEIGHT} style={styles.basicTrackSvg}>
				{/* Full inactive track */}
				<Line
					x1={0}
					y1={basicCy}
					x2={trackWidth}
					y2={basicCy}
					stroke={colors.primaryContainer}
					strokeWidth={BASIC_TRACK_THICKNESS}
					strokeLinecap={'round'}
				/>
				{/* Active track */}
				{activeEnd > 0 && (
					<Line
						x1={0}
						y1={basicCy}
						x2={activeEnd}
						y2={basicCy}
						stroke={colors.primary}
						strokeWidth={BASIC_TRACK_THICKNESS}
						strokeLinecap={'round'}
					/>
				)}
			</Svg>
		);
	}

	if (style === 'expressive-variant') {
		const vcy = VARIANT_TRACK_HEIGHT / 2;
		return (
			<Svg width={trackWidth} height={VARIANT_TRACK_HEIGHT} style={styles.variantTrackSvg}>
				{/* Inactive track (full-width rounded rect) */}
				<Rect
					x={0}
					y={0}
					width={trackWidth}
					height={VARIANT_TRACK_HEIGHT}
					rx={VARIANT_TRACK_RADIUS}
					ry={VARIANT_TRACK_RADIUS}
					fill={colors.primaryContainer}
				/>

				{/* Active track (flat right edge meets the caret) */}
				{activeEnd > 0 && (
					<Path
						d={buildVariantActiveTrackPath(
							activeEnd,
							VARIANT_TRACK_HEIGHT,
							VARIANT_TRACK_RADIUS
						)}
						fill={colors.primary}
					/>
				)}

				{/* Stop indicator */}
				<Circle cx={stopCx} cy={vcy} r={STOP_RADIUS} fill={colors.primary} />
			</Svg>
		);
	}

	// Default: expressive
	return (
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
	basicTrackSvg: {
		position: 'absolute',
		top: HIT_SLOP + (THUMB_SIZE - BASIC_TRACK_HEIGHT) / 2,
		left: 0,
	},
	thumb: {
		position: 'absolute',
		top: (THUMB_SIZE + HIT_SLOP * 2) / 2 - THUMB_SIZE / 2,
		width: THUMB_SIZE,
		height: THUMB_SIZE,
		borderRadius: THUMB_SIZE / 2,
	},
	variantTrackSvg: {
		position: 'absolute',
		top: HIT_SLOP + (THUMB_SIZE - VARIANT_TRACK_HEIGHT) / 2,
		left: 0,
	},
	variantThumb: {
		position: 'absolute',
		top: (THUMB_SIZE + HIT_SLOP * 2) / 2 - VARIANT_HANDLE_HEIGHT / 2,
		width: VARIANT_HANDLE_WIDTH,
		height: VARIANT_HANDLE_HEIGHT,
		borderRadius: VARIANT_HANDLE_RADIUS,
	},
	basicThumb: {
		position: 'absolute',
		top: (THUMB_SIZE + HIT_SLOP * 2) / 2 - BASIC_THUMB_SIZE / 2,
		width: BASIC_THUMB_SIZE,
		height: BASIC_THUMB_SIZE,
		borderRadius: BASIC_THUMB_SIZE / 2,
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
