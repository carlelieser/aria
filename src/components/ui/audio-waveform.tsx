/**
 * AudioWaveform Component
 *
 * Animated equalizer-style waveform bars used as a "now playing" indicator.
 * Designed to overlay on artwork thumbnails with a translucent scrim.
 * Uses synthetic bouncing animations with staggered phases.
 */

import { View, StyleSheet } from 'react-native';
import Animated, {
	useSharedValue,
	useAnimatedStyle,
	withRepeat,
	withSequence,
	withTiming,
	Easing,
} from 'react-native-reanimated';
import { useEffect } from 'react';

const BAR_COUNT = 5;
const BAR_WIDTH = 2.5;
const BAR_GAP = 2;
const BAR_MIN_HEIGHT = 3;
const BAR_MAX_HEIGHT = 16;
const BAR_BORDER_RADIUS = 1.5;

/** Peak heights form a bell curve — short on edges, tall in center */
const BAR_PEAK_HEIGHTS = [8, 13, BAR_MAX_HEIGHT, 13, 8];

/** Slightly varied speeds so bars drift in/out of phase organically */
const BAR_PHASES: readonly { speed: number; delay: number; peak: number }[] = [
	{ speed: 420, delay: 0, peak: BAR_PEAK_HEIGHTS[0] },
	{ speed: 360, delay: 60, peak: BAR_PEAK_HEIGHTS[1] },
	{ speed: 300, delay: 120, peak: BAR_PEAK_HEIGHTS[2] },
	{ speed: 380, delay: 70, peak: BAR_PEAK_HEIGHTS[3] },
	{ speed: 440, delay: 30, peak: BAR_PEAK_HEIGHTS[4] },
];

interface AudioWaveformProps {
	readonly color?: string;
}

function SyntheticBar({
	speed,
	delay,
	peak,
	color,
}: {
	speed: number;
	delay: number;
	peak: number;
	color: string;
}) {
	const height = useSharedValue(BAR_MIN_HEIGHT);

	useEffect(() => {
		const animate = () => {
			height.value = withRepeat(
				withSequence(
					withTiming(peak, {
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
	}, [height, speed, delay, peak]);

	const animatedStyle = useAnimatedStyle(() => ({
		height: height.value,
	}));

	return <Animated.View style={[styles.bar, animatedStyle, { backgroundColor: color }]} />;
}

const FADE_IN_DURATION = 250;

export function AudioWaveform({ color = '#FFFFFF' }: AudioWaveformProps) {
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
				{BAR_PHASES.map((phase, index) => (
					<SyntheticBar
						key={index}
						speed={phase.speed}
						delay={phase.delay}
						peak={phase.peak}
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
		alignItems: 'center',
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
