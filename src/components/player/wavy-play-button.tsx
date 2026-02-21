/**
 * WavyPlayButton Component
 *
 * Unified play/pause button where a wavy SVG shape IS the button background.
 * Idle: small filled wavy circle (4 peaks, no stroke).
 * Loading: smoothly grows to a larger wavy shape with morphing peaks, rotation, and visible stroke.
 */

import { useEffect, useRef, useCallback, memo } from 'react';
import { Pressable, View, StyleSheet } from 'react-native';
import Animated, {
	useSharedValue,
	useAnimatedProps,
	useAnimatedStyle,
	withRepeat,
	withTiming,
	withSpring,
	runOnJS,
	cancelAnimation,
	Easing,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import { Play, Pause } from 'lucide-react-native';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const AnimatedPath = Animated.createAnimatedComponent(Path);

const ANGULAR_STEP = Math.PI / 90;
const TWO_PI = 2 * Math.PI;
const WAVE_AMPLITUDE_RATIO = 0.1;

const PHASE_DURATION = 3000;
const PEAK_CHANGE_INTERVAL = 2000;
const AMPLITUDE_FADE_DURATION = 250;
const STROKE_TRANSITION_DURATION = 200;

const PEAK_MIN = 3;
const PEAK_MAX = 6;
const IDLE_PEAKS = 4;

const SPRING_CONFIG = { damping: 18, stiffness: 180 };

/** M3 FAB container sizes (dp) */
const FAB_CONTAINER_SIZES = {
	sm: 40,
	md: 56,
	lg: 96,
} as const;

const RING_PADDING = 10;
const RING_STROKE_WIDTH = 4;

const ICON_SIZE = {
	sm: 24,
	md: 32,
	lg: 48,
} as const;

function buildWavyCirclePath(
	cx: number,
	cy: number,
	baseRadius: number,
	amplitude: number,
	peaks: number,
	phase: number,
): string {
	'worklet';

	const r0 = baseRadius + amplitude * Math.sin(-phase);
	let d = `M ${(cx + r0).toFixed(1)} ${cy.toFixed(1)}`;

	for (let theta = ANGULAR_STEP; theta < TWO_PI; theta += ANGULAR_STEP) {
		const r = baseRadius + amplitude * Math.sin(peaks * theta - phase);
		const x = cx + r * Math.cos(theta);
		const y = cy + r * Math.sin(theta);
		d += ` L ${x.toFixed(1)} ${y.toFixed(1)}`;
	}

	d += ' Z';
	return d;
}

interface WavyPlayButtonProps {
	readonly isLoading: boolean;
	readonly isPlaying: boolean;
	readonly onPress: () => void;
	readonly color: string;
	readonly iconColor: string;
	readonly size: 'sm' | 'md' | 'lg';
}

function deriveMetrics(size: 'sm' | 'md' | 'lg') {
	const fabSize = FAB_CONTAINER_SIZES[size];
	const canvasSize = fabSize + RING_PADDING * 2;
	const center = canvasSize / 2;
	const idleRadius = fabSize / 2;
	const loadingRawRadius = (canvasSize - RING_STROKE_WIDTH) / 2;
	const loadingAmplitude = loadingRawRadius * WAVE_AMPLITUDE_RATIO;
	const loadingRadius = loadingRawRadius - loadingAmplitude;

	return { fabSize, canvasSize, center, idleRadius, loadingRadius, loadingAmplitude };
}

export const WavyPlayButton = memo(function WavyPlayButton({
	isLoading,
	isPlaying,
	onPress,
	color,
	iconColor,
	size,
}: WavyPlayButtonProps) {
	const { fabSize, canvasSize, center, idleRadius, loadingRadius, loadingAmplitude } =
		deriveMetrics(size);

	const idleAmplitude = idleRadius * WAVE_AMPLITUDE_RATIO;
	const idleBaseRadius = idleRadius - idleAmplitude;

	const targetRadius = useSharedValue(idleBaseRadius);
	const targetAmplitude = useSharedValue(idleAmplitude);
	const containerSize = useSharedValue<number>(fabSize);
	const phase = useSharedValue(0);
	const peaks = useSharedValue(IDLE_PEAKS);
	const ampScale = useSharedValue(1);
	const strokeAnim = useSharedValue(0);

	const activeRef = useRef(false);

	const changePeaks = useCallback(() => {
		if (!activeRef.current) return;

		const current = peaks.value;
		let newPeaks = PEAK_MIN + Math.floor(Math.random() * (PEAK_MAX - PEAK_MIN + 1));
		while (newPeaks === current) {
			newPeaks = PEAK_MIN + Math.floor(Math.random() * (PEAK_MAX - PEAK_MIN + 1));
		}
		ampScale.value = withTiming(0, { duration: AMPLITUDE_FADE_DURATION }, (finished) => {
			if (finished) {
				peaks.value = newPeaks;
				ampScale.value = withTiming(1, { duration: AMPLITUDE_FADE_DURATION }, (done) => {
					if (done) {
						runOnJS(schedulePeakChange)();
					}
				});
			}
		});
	}, [peaks, ampScale]);

	const schedulePeakChange = useCallback(() => {
		if (!activeRef.current) return;
		setTimeout(changePeaks, PEAK_CHANGE_INTERVAL);
	}, [changePeaks]);

	useEffect(() => {
		if (isLoading || !isPlaying) {
			activeRef.current = true;

			targetRadius.value = withSpring(loadingRadius, SPRING_CONFIG);
			targetAmplitude.value = withSpring(loadingAmplitude, SPRING_CONFIG);
			containerSize.value = withSpring(canvasSize, SPRING_CONFIG);
			strokeAnim.value = withTiming(RING_STROKE_WIDTH, {
				duration: STROKE_TRANSITION_DURATION,
			});

			phase.value = withRepeat(
				withTiming(phase.value + TWO_PI, {
					duration: PHASE_DURATION,
					easing: Easing.linear,
				}),
				-1,
				false,
			);

			schedulePeakChange();
		} else {
			activeRef.current = false;

			targetRadius.value = withSpring(idleBaseRadius, SPRING_CONFIG);
			targetAmplitude.value = withSpring(idleAmplitude, SPRING_CONFIG);
			containerSize.value = withSpring(fabSize, SPRING_CONFIG);
			strokeAnim.value = withTiming(0, { duration: STROKE_TRANSITION_DURATION });

			cancelAnimation(phase);
			cancelAnimation(ampScale);

			peaks.value = IDLE_PEAKS;
			ampScale.value = 1;
		}

		return () => {
			activeRef.current = false;
			cancelAnimation(phase);
			cancelAnimation(ampScale);
		};
	}, [ampScale, canvasSize, containerSize, fabSize, idleAmplitude, idleBaseRadius, isLoading, isPlaying, loadingAmplitude, loadingRadius, peaks, phase, schedulePeakChange, strokeAnim, targetAmplitude, targetRadius]);

	const animatedProps = useAnimatedProps(() => ({
		d: buildWavyCirclePath(
			center,
			center,
			targetRadius.value,
			targetAmplitude.value * ampScale.value,
			peaks.value,
			phase.value,
		),
		strokeWidth: strokeAnim.value,
	}));

	const iconSize = ICON_SIZE[size];

	const pressableStyle = useAnimatedStyle(() => ({
		width: containerSize.value,
		height: containerSize.value,
		borderRadius: containerSize.value / 2,
	}));

	return (
		<View style={[styles.layoutWrapper, { width: canvasSize, height: canvasSize }]}>
			<Svg width={canvasSize} height={canvasSize} style={styles.svg}>
				<AnimatedPath
					animatedProps={animatedProps}
					stroke={color}
					strokeLinejoin="round"
					fill={color}
				/>
			</Svg>
			<AnimatedPressable onPress={onPress} style={[styles.pressable, pressableStyle]}>
				<View style={styles.iconOverlay}>
					{isPlaying && !isLoading ? (
						<Pause size={iconSize} color={iconColor} fill={iconColor} />
					) : (
						<Play size={iconSize} color={iconColor} fill={iconColor} />
					)}
				</View>
			</AnimatedPressable>
		</View>
	);
});

const styles = StyleSheet.create({
	layoutWrapper: {
		alignItems: 'center',
		justifyContent: 'center',
	},
	svg: {
		position: 'absolute',
	},
	pressable: {
		alignItems: 'center',
		justifyContent: 'center',
	},
	iconOverlay: {
		...StyleSheet.absoluteFillObject,
		alignItems: 'center',
		justifyContent: 'center',
	},
});
