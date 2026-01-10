/**
 * AnimatedSplash Component
 *
 * Custom animated splash screen with morphing polygon.
 * Slides up and fades out when ready.
 */

import React, { useEffect, useCallback, useState } from 'react';
import { StyleSheet, Dimensions } from 'react-native';
import Animated, {
	useSharedValue,
	useAnimatedStyle,
	withTiming,
	withSpring,
	withDelay,
	Easing,
	runOnJS,
	interpolate,
} from 'react-native-reanimated';
import { AnimatedPolygonView } from './animated-polygon';
import { M3Colors } from '@/lib/theme/colors';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const POLYGON_SIZE = 200;
const ANIMATION_DURATION = 400;
const MORPH_DURATION = 800;
const MORPH_INTERVAL = 2500;
const ROTATION_DURATION = 4000;
const MIN_SEGMENTS = 3;
const MAX_SEGMENTS = 6;

interface AnimatedSplashProps {
	/** Whether the app is ready and splash should hide */
	isReady: boolean;
	/** Callback when splash animation completes */
	onAnimationComplete?: () => void;
	/** Use dark theme colors */
	isDark?: boolean;
}

/**
 * Generates a random segment count different from the current one
 */
function getRandomSegments(current: number): number {
	let next: number;
	do {
		next = Math.floor(Math.random() * (MAX_SEGMENTS - MIN_SEGMENTS + 1)) + MIN_SEGMENTS;
	} while (next === current);
	return next;
}

export function AnimatedSplash({
	isReady,
	onAnimationComplete,
	isDark = true,
}: AnimatedSplashProps) {
	const translateY = useSharedValue(0);
	const opacity = useSharedValue(1);
	const [segments, setSegments] = useState(MIN_SEGMENTS);
	const polygonRotation = useSharedValue(0);
	const polygonScale = useSharedValue(1);

	const colors = isDark ? M3Colors.dark : M3Colors.light;

	const handleAnimationComplete = useCallback(() => {
		onAnimationComplete?.();
	}, [onAnimationComplete]);

	// Pulse on segment change
	useEffect(() => {
		polygonScale.value = withSpring(1.15, { damping: 8, stiffness: 200 }, () => {
			polygonScale.value = withSpring(1, { damping: 12, stiffness: 150 });
		});
	}, [segments, polygonScale]);

	// Morph animation loop
	useEffect(() => {
		const intervalId = setInterval(() => {
			setSegments((current) => getRandomSegments(current));
		}, MORPH_INTERVAL);

		return () => clearInterval(intervalId);
	}, []);

	// Continuous rotation
	useEffect(() => {
		let rotationAngle = 0;

		const intervalId = setInterval(() => {
			rotationAngle += 360;
			polygonRotation.value = withTiming(rotationAngle, {
				duration: ROTATION_DURATION,
				easing: Easing.linear,
			});
		}, ROTATION_DURATION);

		return () => clearInterval(intervalId);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	useEffect(() => {
		if (isReady) {
			// Slide up and fade out
			translateY.value = withTiming(
				-SCREEN_HEIGHT,
				{
					duration: ANIMATION_DURATION,
					easing: Easing.in(Easing.cubic),
				},
				(finished) => {
					if (finished) {
						runOnJS(handleAnimationComplete)();
					}
				}
			);

			opacity.value = withDelay(
				ANIMATION_DURATION / 2,
				withTiming(0, {
					duration: ANIMATION_DURATION / 2,
					easing: Easing.out(Easing.ease),
				})
			);
		}
	}, [isReady, translateY, opacity, handleAnimationComplete]);

	const containerStyle = useAnimatedStyle(() => ({
		transform: [{ translateY: translateY.value }],
	}));

	const backgroundStyle = useAnimatedStyle(() => ({
		opacity: opacity.value,
	}));

	const polygonContainerStyle = useAnimatedStyle(() => ({
		transform: [
			{ scale: polygonScale.value },
			{ rotate: `${polygonRotation.value}deg` },
		],
		opacity: interpolate(translateY.value, [0, -SCREEN_HEIGHT / 3], [1, 0]),
	}));

	return (
		<Animated.View style={[styles.container, containerStyle]}>
			<Animated.View
				style={[styles.background, { backgroundColor: colors.background }, backgroundStyle]}
			/>
			<Animated.View style={[styles.content, polygonContainerStyle]}>
				<AnimatedPolygonView
					segments={segments}
					size={POLYGON_SIZE}
					fill={colors.onSurface}
					stroke={colors.onSurface}
					strokeWidth={40}
					springConfig={{ damping: 12, stiffness: 80, mass: 0.5 }}
				/>
			</Animated.View>
		</Animated.View>
	);
}

const styles = StyleSheet.create({
	container: {
		...StyleSheet.absoluteFillObject,
		zIndex: 9999,
	},
	background: {
		...StyleSheet.absoluteFillObject,
	},
	content: {
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center',
	},
});

export type { AnimatedSplashProps };
