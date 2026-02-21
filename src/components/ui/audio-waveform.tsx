/**
 * AudioWaveform Component
 *
 * Animated equalizer-style waveform bars used as a "now playing" indicator.
 * Designed to overlay on artwork thumbnails with a translucent scrim.
 *
 * Supports two modes:
 * - Real-time: driven by shared values from native audio capture
 * - Synthetic: canned bouncing animation as fallback
 */

import { View, StyleSheet } from 'react-native';
import Animated, {
	useSharedValue,
	useAnimatedStyle,
	withRepeat,
	withSequence,
	withTiming,
	Easing,
	type SharedValue,
} from 'react-native-reanimated';
import { useEffect } from 'react';

const BAR_COUNT = 12;
const BAR_WIDTH = 2;
const BAR_GAP = 1;
const BAR_MIN_HEIGHT = 2;
const BAR_MAX_HEIGHT = 16;
const BAR_BORDER_RADIUS = 1;

const BAR_PHASES: readonly { speed: number; delay: number }[] = [
	{ speed: 400, delay: 0 },
	{ speed: 480, delay: 120 },
	{ speed: 350, delay: 50 },
	{ speed: 520, delay: 180 },
	{ speed: 380, delay: 90 },
	{ speed: 460, delay: 210 },
	{ speed: 340, delay: 30 },
	{ speed: 500, delay: 160 },
	{ speed: 370, delay: 70 },
	{ speed: 440, delay: 200 },
	{ speed: 360, delay: 100 },
	{ speed: 490, delay: 140 },
];

const TIMING_CONFIG = {
	duration: 80,
	easing: Easing.out(Easing.cubic),
} as const;

interface AudioWaveformProps {
	readonly color?: string;
	/** Real-time audio levels from native capture (0.0–1.0 per band) */
	readonly levels?: SharedValue<number[]>;
}

function SyntheticBar({ speed, delay, color }: { speed: number; delay: number; color: string }) {
	const height = useSharedValue(BAR_MIN_HEIGHT);

	useEffect(() => {
		const animate = () => {
			height.value = withRepeat(
				withSequence(
					withTiming(BAR_MAX_HEIGHT, {
						duration: speed,
						easing: Easing.bezier(0.4, 0, 0.2, 1),
					}),
					withTiming(BAR_MIN_HEIGHT, {
						duration: speed,
						easing: Easing.bezier(0.4, 0, 0.2, 1),
					})
				),
				-1,
				false
			);
		};

		if (delay > 0) {
			const timeout = setTimeout(animate, delay);
			return () => clearTimeout(timeout);
		}

		animate();
		return undefined;
	}, [height, speed, delay]);

	const animatedStyle = useAnimatedStyle(() => ({
		height: height.value,
	}));

	return <Animated.View style={[styles.bar, animatedStyle, { backgroundColor: color }]} />;
}

function RealTimeBar({
	levels,
	index,
	color,
}: {
	levels: SharedValue<number[]>;
	index: number;
	color: string;
}) {
	const animatedStyle = useAnimatedStyle(() => {
		const level = levels.value[index] ?? 0;
		const target = BAR_MIN_HEIGHT + level * (BAR_MAX_HEIGHT - BAR_MIN_HEIGHT);
		return { height: withTiming(target, TIMING_CONFIG) };
	});

	return <Animated.View style={[styles.bar, animatedStyle, { backgroundColor: color }]} />;
}

const FADE_IN_DURATION = 250;

const BAR_INDICES = Array.from({ length: BAR_COUNT }, (_, i) => i);

export function AudioWaveform({ color = '#FFFFFF', levels }: AudioWaveformProps) {
	const useRealTime = levels !== undefined;
	const opacity = useSharedValue(0);

	useEffect(() => {
		opacity.value = withTiming(1, {
			duration: FADE_IN_DURATION,
			easing: Easing.out(Easing.cubic),
		});
	}, [opacity]);

	const fadeStyle = useAnimatedStyle(() => ({
		opacity: opacity.value,
	}));

	return (
		<Animated.View style={[styles.container, fadeStyle]}>
			<View style={styles.scrim} />
			<View style={styles.barsContainer}>
				{useRealTime
					? BAR_INDICES.map((index) => (
							<RealTimeBar key={index} levels={levels} index={index} color={color} />
						))
					: BAR_PHASES.map((phase, index) => (
							<SyntheticBar
								key={index}
								speed={phase.speed}
								delay={phase.delay}
								color={color}
							/>
						))}
			</View>
		</Animated.View>
	);
}

const TOTAL_WIDTH = BAR_COUNT * BAR_WIDTH + (BAR_COUNT - 1) * BAR_GAP;

const styles = StyleSheet.create({
	container: {
		...StyleSheet.absoluteFillObject,
		justifyContent: 'center',
		alignItems: 'center',
	},
	scrim: {
		...StyleSheet.absoluteFillObject,
		backgroundColor: 'rgba(0, 0, 0, 0.45)',
	},
	barsContainer: {
		flexDirection: 'row',
		alignItems: 'flex-end',
		gap: BAR_GAP,
		height: BAR_MAX_HEIGHT,
		width: TOTAL_WIDTH,
	},
	bar: {
		width: BAR_WIDTH,
		borderRadius: BAR_BORDER_RADIUS,
		minHeight: BAR_MIN_HEIGHT,
	},
});

export type { AudioWaveformProps };
