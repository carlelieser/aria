import React, { useEffect, useCallback, useState, useRef } from 'react';
import { StyleSheet, View, Image, Platform, useWindowDimensions } from 'react-native';
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

const IS_WEB = Platform.OS === 'web';

const POLYGON_SIZE = 225;
const ICON_SIZE = 100;
const ANIMATION_DURATION = 400;
const MORPH_INTERVAL = 2500;
const ROTATION_DURATION = 4000;
const MIN_SEGMENTS = 3;
const MAX_SEGMENTS = 6;

interface AnimatedSplashProps {
	isReady: boolean;
	onAnimationComplete?: () => void;
	isDark?: boolean;
}

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
	const { height: screenHeight } = useWindowDimensions();
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
			translateY.value = withTiming(-screenHeight, {
				duration: ANIMATION_DURATION,
				easing: Easing.in(Easing.cubic),
			});

			opacity.value = withDelay(
				ANIMATION_DURATION / 2,
				withTiming(0, {
					duration: ANIMATION_DURATION / 2,
					easing: Easing.out(Easing.ease),
				})
			);

			// Web fallback: use setTimeout since withTiming callback may not fire
			if (IS_WEB) {
				setTimeout(() => {
					handleAnimationComplete();
				}, ANIMATION_DURATION + 50);
			}
		}
	}, [isReady, translateY, opacity, handleAnimationComplete, screenHeight]);

	// Native: watch animation completion via useAnimatedReaction
	useAnimatedReaction(
		() => translateY.value,
		(currentValue, previousValue) => {
			if (
				previousValue !== null &&
				currentValue <= -screenHeight &&
				previousValue > -screenHeight
			) {
				runOnJS(handleAnimationComplete)();
			}
		},
		[handleAnimationComplete]
	);

	const containerStyle = useAnimatedStyle(() => ({
		transform: [{ translateY: translateY.value }],
	}));

	const backgroundStyle = useAnimatedStyle(() => ({
		opacity: opacity.value,
	}));

	const polygonContainerStyle = useAnimatedStyle(() => ({
		transform: [{ scale: polygonScale.value }, { rotate: `${polygonRotation.value}deg` }],
		opacity: interpolate(translateY.value, [0, -screenHeight / 3], [1, 0]),
	}));

	// Web: use CSS transitions for reliable animation
	const [webDismissing, setWebDismissing] = useState(false);

	useEffect(() => {
		if (IS_WEB && isReady) {
			setWebDismissing(true);
			const timer = setTimeout(() => {
				onAnimationComplete?.();
			}, ANIMATION_DURATION);
			return () => clearTimeout(timer);
		}
	}, [isReady, onAnimationComplete]);

	// Web uses CSS transitions, native uses Reanimated
	if (IS_WEB) {
		return (
			<View
				style={[
					styles.container,
					{
						transform: [{ translateY: webDismissing ? -screenHeight : 0 }],
						opacity: webDismissing ? 0 : 1,
						// @ts-expect-error - web-only CSS property
						transition: `transform ${ANIMATION_DURATION}ms ease-in, opacity ${ANIMATION_DURATION}ms ease-out`,
					},
				]}
			>
				<View style={[styles.background, { backgroundColor: colors.background }]} />
				<View style={styles.content}>
					<View style={styles.iconWrapper}>
						<Image
							source={require('@/assets/icon-content.png')}
							style={{ width: ICON_SIZE, height: ICON_SIZE }}
							resizeMode="contain"
						/>
					</View>
					<View style={styles.polygonWrapper}>
						<AnimatedPolygonView
							segments={segments}
							size={POLYGON_SIZE}
							fill={colors.onSurface}
							stroke={colors.onSurface}
							strokeWidth={40}
							springConfig={{ damping: 20, stiffness: 100, mass: 0.5 }}
						/>
					</View>
				</View>
			</View>
		);
	}

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
						springConfig={{ damping: 20, stiffness: 100, mass: 0.5 }}
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
		width: 148,
		height: 148,
		position: 'absolute',
		alignItems: 'center',
		justifyContent: 'center',
		zIndex: 999999,
		overflow: 'visible',
	},
});

export type { AnimatedSplashProps };
