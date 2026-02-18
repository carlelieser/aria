/**
 * AudioWaveform Component
 *
 * Animated equalizer-style waveform bars used as a "now playing" indicator.
 * Designed to overlay on artwork thumbnails with a translucent scrim.
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

const BAR_COUNT = 4;
const BAR_WIDTH = 3;
const BAR_GAP = 2;
const BAR_MIN_HEIGHT = 3;
const BAR_MAX_HEIGHT = 16;
const BAR_BORDER_RADIUS = 1.5;

const BAR_PHASES: ReadonlyArray<{ speed: number; delay: number }> = [
	{ speed: 400, delay: 0 },
	{ speed: 500, delay: 150 },
	{ speed: 350, delay: 80 },
	{ speed: 450, delay: 200 },
];

interface AudioWaveformProps {
	readonly color?: string;
}

function WaveformBar({ speed, delay, color }: { speed: number; delay: number; color: string }) {
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

	return (
		<Animated.View
			style={[
				styles.bar,
				animatedStyle,
				{ backgroundColor: color },
			]}
		/>
	);
}

export function AudioWaveform({ color = '#FFFFFF' }: AudioWaveformProps) {
	return (
		<View style={styles.container}>
			<View style={styles.scrim} />
			<View style={styles.barsContainer}>
				{BAR_PHASES.map((phase, index) => (
					<WaveformBar
						key={index}
						speed={phase.speed}
						delay={phase.delay}
						color={color}
					/>
				))}
			</View>
		</View>
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
