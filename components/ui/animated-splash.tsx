/**
 * AnimatedSplash Component
 *
 * Custom animated splash screen with morphing polygon.
 * Slides up and fades out when ready.
 */

import React, { useEffect, useCallback, useState, useRef } from 'react';
import { StyleSheet, Dimensions, View, Image } from 'react-native';
import Animated, {
	useSharedValue,
	useAnimatedStyle,
	useAnimatedReaction,
	withTiming,
	withSpring,
	withDelay,
	withRepeat,
	Easing,
	runOnJS,
	interpolate,
} from 'react-native-reanimated';
import { AnimatedPolygonView } from './animated-polygon';
import { M3Colors } from '@/lib/theme/colors';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const POLYGON_SIZE = 200;
const ICON_SIZE = 75;
const ANIMATION_DURATION = 400;
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
	const morphCycle = useSharedValue(0);
	const isFirstRender = useRef(true);

	const colors = isDark ? M3Colors.dark : M3Colors.light;

	const handleAnimationComplete = useCallback(() => {
		onAnimationComplete?.();
	}, [onAnimationComplete]);

	const updateSegments = useCallback(() => {
		setSegments((prev) => getRandomSegments(prev));
	}, []);

	// Pulse on segment change (skip initial mount)
	useEffect(() => {
		if (isFirstRender.current) {
			isFirstRender.current = false;
			return;
		}
		polygonScale.value = withSpring(1.15, { damping: 8, stiffness: 200 }, () => {
			polygonScale.value = withSpring(1, { damping: 12, stiffness: 150 });
		});
	}, [segments, polygonScale]);

	// Morph animation loop - driven by native thread timing
	useEffect(() => {
		morphCycle.value = withRepeat(
			withTiming(1, { duration: MORPH_INTERVAL, easing: Easing.linear }),
			-1,
			true
		);
	}, [morphCycle]);

	useAnimatedReaction(
		() => Math.round(morphCycle.value),
		(current, previous) => {
			if (previous !== null && current !== previous) {
				runOnJS(updateSegments)();
			}
		},
		[updateSegments]
	);

	// Continuous rotation using withRepeat (runs on native thread, no JS intervals)
	useEffect(() => {
		polygonRotation.value = withRepeat(
			withTiming(360, {
				duration: ROTATION_DURATION,
				easing: Easing.linear,
			}),
			-1, // Infinite repeats
			false // Don't reverse
		);
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
		transform: [{ scale: polygonScale.value }, { rotate: `${polygonRotation.value}deg` }],
		opacity: interpolate(translateY.value, [0, -SCREEN_HEIGHT / 3], [1, 0]),
	}));

	return (
		<Animated.View style={[styles.container, containerStyle]}>
			<Animated.View
				style={[styles.background, { backgroundColor: colors.background }, backgroundStyle]}
			/>
			<View style={styles.content}>
				<View style={styles.iconWrapper}>
					<Image
						source={require('@/assets/icon-content.png')}
						style={{ width: ICON_SIZE, height: ICON_SIZE }}
						resizeMode="contain"
					/>
				</View>
				<Animated.View style={[styles.polygonWrapper, polygonContainerStyle]}>
					<AnimatedPolygonView
						segments={segments}
						size={POLYGON_SIZE}
						fill={colors.onSurface}
						stroke={colors.onSurface}
						strokeWidth={40}
						springConfig={{ damping: 12, stiffness: 80, mass: 0.5 }}
					/>
				</Animated.View>
			</View>
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
	polygonWrapper: {
		position: 'absolute',
	},
	iconWrapper: {
		width: 124,
		height: 124,
		position: 'absolute',
		alignItems: 'center',
		justifyContent: 'center',
		zIndex: 999999,
		overflow: 'visible',
	},
});

export type { AnimatedSplashProps };
