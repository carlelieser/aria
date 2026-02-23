/**
 * ProgressTrack Component
 *
 * Generic presentational progress track supporting three visual styles:
 * expressive (wavy), expressive-variant (thick caret), and basic (linear).
 * No player/store dependencies — colors and state are injected via props.
 */

import { View, LayoutChangeEvent, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
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
import type { ProgressBarStyle } from '@/src/application/state/settings-store';

const AnimatedPath = Animated.createAnimatedComponent(Path);

/** M3 Expressive determinate progress indicator tokens */
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

/** Expressive variant tokens (M3 Expressive slider) */
const VARIANT_TRACK_HEIGHT = 16;
const VARIANT_TRACK_RADIUS = VARIANT_TRACK_HEIGHT / 2;
const VARIANT_HANDLE_WIDTH = 4;
const VARIANT_HANDLE_HEIGHT = 44;
const VARIANT_HANDLE_RADIUS = 2;
const VARIANT_THUMB_GAP = 6;
const VARIANT_INSIDE_CORNER = 2;

/** Basic style tokens */
const BASIC_TRACK_THICKNESS = 4;
const BASIC_THUMB_SIZE = 16;
const BASIC_TRACK_HEIGHT = BASIC_TRACK_THICKNESS;

interface ProgressTrackColors {
	readonly primary: string;
	readonly primaryContainer: string;
	readonly onSurfaceVariant: string;
	readonly surfaceContainerHighest?: string;
}

export interface ProgressTrackProps {
	readonly variant: ProgressBarStyle;
	readonly progress: number;
	readonly colors: ProgressTrackColors;
	readonly animated?: boolean;
	readonly interactive?: boolean;
	readonly onSeek?: (progress: number) => void;
	readonly showTimeLabels?: boolean;
	readonly currentTime?: string;
	readonly totalTime?: string;
	readonly isBuffering?: boolean;
	readonly disabled?: boolean;
}

/**
 * Builds a sine-wave polyline path from capInset to width-capInset.
 * Phase shifts the wave pattern.
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
 * Builds the active track path with rounded left corners and
 * concave inside corners on the right edge (thumb-side gap per M3 spec).
 */
function buildVariantActiveTrackPath(
	width: number,
	height: number,
	radius: number,
	gap: number,
	insideCorner: number
): string {
	const r = Math.min(radius, width, height / 2);
	const ic = insideCorner;
	const rightX = width - gap;

	if (rightX <= r) {
		return `M ${r} 0 A ${r} ${r} 0 0 0 0 ${r} L 0 ${height - r} A ${r} ${r} 0 0 0 ${r} ${height} Z`;
	}

	return [
		`M ${r} 0`,
		`L ${rightX - ic} 0`,
		`Q ${rightX} 0 ${rightX} ${ic}`,
		`L ${rightX} ${height - ic}`,
		`Q ${rightX} ${height} ${rightX - ic} ${height}`,
		`L ${r} ${height}`,
		`A ${r} ${r} 0 0 1 0 ${height - r}`,
		`L 0 ${r}`,
		`A ${r} ${r} 0 0 1 ${r} 0`,
		'Z',
	].join(' ');
}

/**
 * Builds the inactive track path with rounded right corners and
 * concave inside corners on the left edge (thumb-side gap per M3 spec).
 */
function buildVariantInactiveTrackPath(
	startX: number,
	totalWidth: number,
	height: number,
	radius: number,
	gap: number,
	insideCorner: number
): string {
	const r = Math.min(radius, totalWidth - startX, height / 2);
	const ic = insideCorner;
	const leftX = startX + gap;
	const rightX = totalWidth;

	if (rightX - leftX <= r) {
		return '';
	}

	return [
		`M ${leftX + ic} 0`,
		`L ${rightX - r} 0`,
		`A ${r} ${r} 0 0 1 ${rightX} ${r}`,
		`L ${rightX} ${height - r}`,
		`A ${r} ${r} 0 0 1 ${rightX - r} ${height}`,
		`L ${leftX + ic} ${height}`,
		`Q ${leftX} ${height} ${leftX} ${height - ic}`,
		`L ${leftX} ${ic}`,
		`Q ${leftX} 0 ${leftX + ic} 0`,
		'Z',
	].join(' ');
}

export function ProgressTrack({
	variant,
	progress,
	colors,
	animated = false,
	interactive = false,
	onSeek,
	showTimeLabels = false,
	currentTime,
	totalTime,
	isBuffering = false,
	disabled = false,
}: ProgressTrackProps) {
	const [trackWidth, setTrackWidth] = useState(0);
	const thumbScale = useSharedValue(1);
	const thumbOpacity = useSharedValue(1);
	const isDragging = useRef(false);
	const [localProgress, setLocalProgress] = useState<number | null>(null);

	const isBasic = variant === 'basic';
	const isVariant = variant === 'expressive-variant';

	// Wave phase animation
	const phase = useSharedValue(0);
	const shouldAnimate = animated && !isBasic;

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

	// Buffering thumb pulse
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

	const displayProgress = localProgress ?? progress;
	const activeEnd = displayProgress * trackWidth;
	const activeWidth = Math.max(0, activeEnd);

	// Amplitude: flat when not animating, tapers near 0% / 100%
	const targetAmplitude = useMemo(() => {
		if (!shouldAnimate) return 0;
		if (displayProgress < 0.1) return displayProgress / 0.1;
		if (displayProgress > 0.95) return (1 - displayProgress) / 0.05;
		return 1;
	}, [displayProgress, shouldAnimate]);

	const animatedAmplitude = useSharedValue(0);

	useEffect(() => {
		animatedAmplitude.value = withTiming(targetAmplitude * WAVE_AMPLITUDE, { duration: 300 });
	}, [targetAmplitude, animatedAmplitude]);

	const waveAnimatedProps = useAnimatedProps(() => ({
		d: buildAnimatedWavePath(activeWidth, animatedAmplitude.value, phase.value),
	}));

	const cy = TRACK_HEIGHT / 2;
	const inactiveStart = activeEnd + GAP_SIZE + INACTIVE_INSET;
	const stopCx = trackWidth - STOP_GAP - STOP_RADIUS;
	const inactiveEnd = stopCx - STOP_GAP;

	const handleLayout = useCallback((event: LayoutChangeEvent) => {
		setTrackWidth(event.nativeEvent.layout.width);
	}, []);

	const updateLocalProgress = useCallback(
		(x: number) => {
			const clampedX = Math.max(0, Math.min(x, trackWidth));
			setLocalProgress(trackWidth > 0 ? clampedX / trackWidth : 0);
		},
		[trackWidth]
	);

	const finishSeeking = useCallback(
		(x: number) => {
			const clampedX = Math.max(0, Math.min(x, trackWidth));
			const newProgress = trackWidth > 0 ? clampedX / trackWidth : 0;
			setLocalProgress(null);
			onSeek?.(newProgress);
		},
		[trackWidth, onSeek]
	);

	const isDisabled = disabled || !interactive;

	const panGesture = Gesture.Pan()
		.enabled(!isDisabled)
		.onStart((event) => {
			isDragging.current = true;
			thumbScale.value = withSpring(1.5, { damping: 15, stiffness: 400 });
			runOnJS(updateLocalProgress)(event.x);
		})
		.onUpdate((event) => {
			runOnJS(updateLocalProgress)(event.x);
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

			{/* Thumb */}
			<Animated.View
				style={[
					thumbAnimatedStyle,
					isBasic ? styles.basicThumb : isVariant ? styles.variantThumb : styles.thumb,
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
}

interface TrackRenderParams {
	readonly trackWidth: number;
	readonly activeWidth: number;
	readonly activeEnd: number;
	readonly cy: number;
	readonly inactiveStart: number;
	readonly inactiveEnd: number;
	readonly stopCx: number;
	readonly colors: ProgressTrackColors;
	readonly waveAnimatedProps: ReturnType<typeof useAnimatedProps>;
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
				<Line
					x1={0}
					y1={basicCy}
					x2={trackWidth}
					y2={basicCy}
					stroke={colors.primaryContainer}
					strokeWidth={BASIC_TRACK_THICKNESS}
					strokeLinecap={'round'}
				/>
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
		const inactiveColor = colors.surfaceContainerHighest ?? colors.primaryContainer;
		const inactivePath = buildVariantInactiveTrackPath(
			activeEnd,
			trackWidth,
			VARIANT_TRACK_HEIGHT,
			VARIANT_TRACK_RADIUS,
			VARIANT_THUMB_GAP,
			VARIANT_INSIDE_CORNER
		);
		return (
			<Svg width={trackWidth} height={VARIANT_TRACK_HEIGHT} style={styles.variantTrackSvg}>
				{/* Inactive track (right of thumb) */}
				{inactivePath.length > 0 && <Path d={inactivePath} fill={inactiveColor} />}
				{/* Active track (left of thumb) */}
				{activeEnd > 0 && (
					<Path
						d={buildVariantActiveTrackPath(
							activeEnd,
							VARIANT_TRACK_HEIGHT,
							VARIANT_TRACK_RADIUS,
							VARIANT_THUMB_GAP,
							VARIANT_INSIDE_CORNER
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
			<Circle cx={stopCx} cy={cy} r={STOP_RADIUS} fill={colors.primary} />
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
	variantTrackSvg: {
		position: 'absolute',
		top: HIT_SLOP + (THUMB_SIZE - VARIANT_TRACK_HEIGHT) / 2,
		left: 0,
	},
	thumb: {
		position: 'absolute',
		top: (THUMB_SIZE + HIT_SLOP * 2) / 2 - THUMB_SIZE / 2,
		width: THUMB_SIZE,
		height: THUMB_SIZE,
		borderRadius: THUMB_SIZE / 2,
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
