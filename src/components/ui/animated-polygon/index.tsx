/**
 * AnimatedPolygon Components
 *
 * SVG polygon components with spring animation, external SharedValue control,
 * and static (non-animated) variants.
 */

import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import {
	useSharedValue,
	useDerivedValue,
	useAnimatedReaction,
	withSpring,
	runOnJS,
} from 'react-native-reanimated';
import Svg, { Polygon } from 'react-native-svg';
import { DEFAULT_SIZE, DEFAULT_STROKE_WIDTH } from './types';
import type { AnimatedPolygonProps, ControlledPolygonProps } from './types';
import { generateInterpolatedPointsWorklet } from './generate-points';

export function AnimatedPolygonView({
	segments,
	size = DEFAULT_SIZE,
	fill = 'transparent',
	stroke = '#000000',
	strokeWidth = DEFAULT_STROKE_WIDTH,
	rotation = 0,
	springConfig = { damping: 15, stiffness: 100, mass: 1 },
	style,
}: AnimatedPolygonProps) {
	const animatedSegments = useSharedValue(segments);
	const [currentPoints, setCurrentPoints] = React.useState(() =>
		generateInterpolatedPointsWorklet(segments, size, rotation, strokeWidth)
	);

	React.useEffect(() => {
		animatedSegments.value = withSpring(segments, {
			damping: springConfig.damping ?? 15,
			stiffness: springConfig.stiffness ?? 100,
			mass: springConfig.mass ?? 1,
		});
	}, [
		animatedSegments,
		segments,
		springConfig.damping,
		springConfig.stiffness,
		springConfig.mass,
	]);

	useAnimatedReaction(
		() => animatedSegments.value,
		(currentValue) => {
			const pts = generateInterpolatedPointsWorklet(
				currentValue,
				size,
				rotation,
				strokeWidth
			);
			runOnJS(setCurrentPoints)(pts);
		},
		[size, rotation, strokeWidth]
	);

	return (
		<View style={[styles.container, { width: size, height: size }, style]}>
			<Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
				<Polygon
					points={currentPoints}
					fill={fill}
					stroke={stroke}
					strokeWidth={strokeWidth}
					strokeLinejoin={'round'}
				/>
			</Svg>
		</View>
	);
}

/**
 * Polygon controlled by an external SharedValue.
 * Use this when you want to control the animation yourself.
 */
export function ControlledPolygon({
	segments,
	size = DEFAULT_SIZE,
	fill = 'transparent',
	stroke = '#000000',
	strokeWidth = DEFAULT_STROKE_WIDTH,
	rotation = 0,
	style,
}: ControlledPolygonProps) {
	const [currentPoints, setCurrentPoints] = React.useState(() =>
		generateInterpolatedPointsWorklet(segments.value, size, rotation, strokeWidth)
	);

	useDerivedValue(() => {
		const pts = generateInterpolatedPointsWorklet(segments.value, size, rotation, strokeWidth);
		runOnJS(setCurrentPoints)(pts);
		return pts;
	}, [size, rotation, strokeWidth]);

	return (
		<View style={[styles.container, { width: size, height: size }, style]}>
			<Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
				<Polygon
					points={currentPoints}
					fill={fill}
					stroke={stroke}
					strokeWidth={strokeWidth}
					strokeLinejoin={'round'}
					strokeLinecap={'round'}
				/>
			</Svg>
		</View>
	);
}

/**
 * Static (non-animated) polygon component for cases where animation is not needed.
 */
export function StaticPolygon({
	segments,
	size = DEFAULT_SIZE,
	fill = 'transparent',
	stroke = '#000000',
	strokeWidth = DEFAULT_STROKE_WIDTH,
	rotation = 0,
	style,
}: Omit<AnimatedPolygonProps, 'springConfig'>) {
	const points = useMemo(
		() => generateInterpolatedPointsWorklet(segments, size, rotation, strokeWidth),
		[segments, size, rotation, strokeWidth]
	);

	return (
		<View style={[styles.container, { width: size, height: size }, style]}>
			<Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
				<Polygon
					points={points}
					fill={fill}
					stroke={stroke}
					strokeWidth={strokeWidth}
					strokeLinejoin={'round'}
				/>
			</Svg>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		alignItems: 'center',
		justifyContent: 'center',
	},
});

export type { AnimatedPolygonProps, ControlledPolygonProps } from './types';
