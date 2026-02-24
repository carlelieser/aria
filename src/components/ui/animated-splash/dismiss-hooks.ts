/**
 * AnimatedSplash Dismiss Hooks
 *
 * Custom hooks for dismiss animation, reactions, and animated style composition.
 */

import { useEffect, useCallback, useState } from 'react';
import { useWindowDimensions } from 'react-native';
import {
	useSharedValue,
	useAnimatedStyle,
	useAnimatedReaction,
	withTiming,
	withDelay,
	Easing,
	runOnJS,
	interpolate,
} from 'react-native-reanimated';
import { ANIMATION_DURATION, PROGRESS_BAR_WIDTH, IS_WEB } from './types';

export function useDismissAnimation(isReady: boolean, onAnimationComplete?: () => void) {
	const { height: screenHeight } = useWindowDimensions();
	const translateY = useSharedValue(0);
	const opacity = useSharedValue(1);
	const bootstrapDone = useSharedValue(false);
	const [dismissReady, setDismissReady] = useState(false);

	useEffect(() => {
		if (isReady) {
			bootstrapDone.value = true;
		}
	}, [isReady, bootstrapDone]);

	const handleAnimationComplete = useCallback(() => {
		onAnimationComplete?.();
	}, [onAnimationComplete]);

	return {
		screenHeight,
		translateY,
		opacity,
		bootstrapDone,
		dismissReady,
		setDismissReady,
		handleAnimationComplete,
	};
}

export function useDismissReaction(
	bootstrapDone: { value: boolean },
	progressWidth: { value: number },
	setDismissReady: (ready: boolean) => void
) {
	useAnimatedReaction(
		() => bootstrapDone.value && progressWidth.value >= 0.99,
		(ready, prev) => {
			if (ready && !prev) {
				runOnJS(setDismissReady)(true);
			}
		},
		[setDismissReady]
	);
}

export function useDismissEffect(
	dismissReady: boolean,
	translateY: { value: number },
	opacity: { value: number },
	handleAnimationComplete: () => void,
	screenHeight: number
) {
	useEffect(() => {
		if (dismissReady) {
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

			if (IS_WEB) {
				setTimeout(() => {
					handleAnimationComplete();
				}, ANIMATION_DURATION + 50);
			}
		}
	}, [dismissReady, translateY, opacity, handleAnimationComplete, screenHeight]);
}

export function useNativeDismissReaction(
	translateY: { value: number },
	screenHeight: number,
	handleAnimationComplete: () => void
) {
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
}

export function useAnimatedStyles(
	translateY: { value: number },
	opacity: { value: number },
	polygonScale: { value: number },
	polygonRotation: { value: number },
	screenHeight: number,
	progressWidth: { value: number }
) {
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

	const progressFillStyle = useAnimatedStyle(() => ({
		width: progressWidth.value * PROGRESS_BAR_WIDTH,
	}));

	const progressSectionStyle = useAnimatedStyle(() => ({
		opacity: interpolate(translateY.value, [0, -screenHeight / 4], [1, 0]),
	}));

	return {
		containerStyle,
		backgroundStyle,
		polygonContainerStyle,
		progressFillStyle,
		progressSectionStyle,
	};
}
