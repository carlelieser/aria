import React, { useMemo } from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import {
	useSharedValue,
	useDerivedValue,
	useAnimatedReaction,
	withSpring,
	runOnJS,
	SharedValue,
} from 'react-native-reanimated';
import Svg, { Polygon } from 'react-native-svg';

const DEFAULT_SIZE = 100;
const DEFAULT_STROKE_WIDTH = 2;
const MIN_SEGMENTS = 3;
const MAX_INTERPOLATION_POINTS = 360;

interface AnimatedPolygonProps {
	segments: number;
	size?: number;
	fill?: string;
	stroke?: string;
	strokeWidth?: number;
	rotation?: number;
	springConfig?: {
		damping?: number;
		stiffness?: number;
		mass?: number;
	};
	style?: ViewStyle;
}

function generatePolygonPoints(segments: number, size: number, rotation: number): string {
	const validSegments = Math.max(MIN_SEGMENTS, Math.round(segments));
	const center = size / 2;
	const radius = (size - DEFAULT_STROKE_WIDTH * 2) / 2;
	const rotationRad = (rotation * Math.PI) / 180;

	const points: string[] = [];

	for (let i = 0; i < validSegments; i++) {
		const angle = (2 * Math.PI * i) / validSegments - Math.PI / 2 + rotationRad;
		const x = center + radius * Math.cos(angle);
		const y = center + radius * Math.sin(angle);
		points.push(`${x.toFixed(2)},${y.toFixed(2)}`);
	}

	return points.join(' ');
}

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
		generatePolygonPoints(segments, size, rotation)
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
					strokeLinejoin="round"
				/>
			</Svg>
		</View>
	);
}

interface ControlledPolygonProps {
	/** Shared value controlling the number of segments */
	segments: SharedValue<number>;
	/** Size of the SVG viewbox (width and height) */
	size?: number;
	/** Fill color of the polygon */
	fill?: string;
	/** Stroke color of the polygon */
	stroke?: string;
	/** Stroke width */
	strokeWidth?: number;
	/** Rotation in degrees */
	rotation?: number;
	/** Container style */
	style?: ViewStyle;
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
					strokeLinejoin="round"
					strokeLinecap="round"
				/>
			</Svg>
		</View>
	);
}

/**
 * Worklet version of point generation for use in animated props.
 */
function generateInterpolatedPointsWorklet(
	segments: number,
	size: number,
	rotation: number,
	strokeWidth: number = DEFAULT_STROKE_WIDTH
): string {
	'worklet';

	// Guard against NaN or invalid values
	const safeSegments = Number.isFinite(segments) ? segments : MIN_SEGMENTS;
	const safeSize = Number.isFinite(size) ? size : DEFAULT_SIZE;
	const safeRotation = Number.isFinite(rotation) ? rotation : 0;
	const safeStrokeWidth = Number.isFinite(strokeWidth) ? strokeWidth : DEFAULT_STROKE_WIDTH;

	const validSegments = Math.max(MIN_SEGMENTS, safeSegments);
	const center = safeSize / 2;
	const radius = (safeSize - safeStrokeWidth) / 2;
	const rotationRad = (safeRotation * Math.PI) / 180;

	let points = '';
	const pointCount = MAX_INTERPOLATION_POINTS;

	for (let i = 0; i < pointCount; i++) {
		const t = i / pointCount;
		const segmentIndex = t * validSegments;
		const currentVertex = Math.floor(segmentIndex);
		const nextVertex = (currentVertex + 1) % Math.ceil(validSegments);
		const localT = segmentIndex - currentVertex;

		const angle1 = (2 * Math.PI * currentVertex) / validSegments - Math.PI / 2 + rotationRad;
		const angle2 = (2 * Math.PI * nextVertex) / validSegments - Math.PI / 2 + rotationRad;

		let adjustedAngle2 = angle2;
		if (nextVertex === 0 && currentVertex === Math.floor(validSegments)) {
			adjustedAngle2 = angle1 + (2 * Math.PI) / validSegments;
		}

		const x1 = center + radius * Math.cos(angle1);
		const y1 = center + radius * Math.sin(angle1);
		const x2 = center + radius * Math.cos(adjustedAngle2);
		const y2 = center + radius * Math.sin(adjustedAngle2);

		const x = x1 + (x2 - x1) * localT;
		const y = y1 + (y2 - y1) * localT;

		if (i > 0) {
			points += ' ';
		}
		points += `${x.toFixed(2)},${y.toFixed(2)}`;
	}

	return points;
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
		() => generatePolygonPoints(segments, size, rotation),
		[segments, size, rotation]
	);

	return (
		<View style={[styles.container, { width: size, height: size }, style]}>
			<Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
				<Polygon
					points={points}
					fill={fill}
					stroke={stroke}
					strokeWidth={strokeWidth}
					strokeLinejoin="round"
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

export type { AnimatedPolygonProps, ControlledPolygonProps };
