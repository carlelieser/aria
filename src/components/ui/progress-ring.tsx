import { memo, useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, { useSharedValue, withTiming, useAnimatedProps } from 'react-native-reanimated';
import { Svg, Circle } from 'react-native-svg';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface ProgressRingProps {
	readonly progress: number;
	readonly size: number;
	readonly strokeWidth: number;
	readonly color: string;
	readonly backgroundColor: string;
}

export const ProgressRing = memo(function ProgressRing({
	progress,
	size,
	strokeWidth,
	color,
	backgroundColor,
}: ProgressRingProps) {
	const radius = (size - strokeWidth) / 2;
	const circumference = 2 * Math.PI * radius;

	const animatedProgress = useSharedValue(progress);

	useEffect(() => {
		animatedProgress.value = withTiming(progress, { duration: 300 });
	}, [progress, animatedProgress]);

	const animatedProps = useAnimatedProps(() => ({
		strokeDashoffset: circumference * (1 - animatedProgress.value),
	}));

	return (
		<Svg width={size} height={size} style={styles.progressRing}>
			<Circle
				cx={size / 2}
				cy={size / 2}
				r={radius}
				stroke={backgroundColor}
				strokeWidth={strokeWidth}
				fill={'none'}
			/>
			<AnimatedCircle
				cx={size / 2}
				cy={size / 2}
				r={radius}
				stroke={color}
				strokeWidth={strokeWidth}
				fill={'none'}
				strokeDasharray={circumference}
				animatedProps={animatedProps}
				strokeLinecap={'round'}
				rotation={-90}
				origin={`${size / 2}, ${size / 2}`}
			/>
		</Svg>
	);
});

const styles = StyleSheet.create({
	progressRing: {
		position: 'absolute',
	},
});
