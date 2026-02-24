/**
 * ProgressToast Component
 *
 * Generic toast notification for background operations with progress tracking.
 * Supports expanded and minimized (pill) states with swipe-to-minimize gestures.
 */

import { memo, useEffect, useState, useCallback } from 'react';
import { Gesture } from 'react-native-gesture-handler';
import {
	useSharedValue,
	useAnimatedStyle,
	withSpring,
	withTiming,
	runOnJS,
	interpolate,
	Extrapolation,
} from 'react-native-reanimated';
import { useToastPosition } from '@/src/hooks/use-toast-position';
import { ToastPill } from './toast-pill';
import { ToastExpanded } from './toast-expanded';
import type { ProgressToastProps } from './types';

export type { ProgressToastProps } from './types';

const SWIPE_THRESHOLD = 50;
const DISMISS_VELOCITY = 500;
const COMPLETE_DISPLAY_DURATION = 2000;

export const ProgressToast = memo(function ProgressToast({
	portalName,
	isActive,
	isComplete,
	phaseMessage,
	percentage,
	progressText,
	currentItemLabel,
}: ProgressToastProps) {
	const bottomOffset = useToastPosition();

	const [isMinimized, setIsMinimized] = useState(false);
	const [isVisible, setIsVisible] = useState(false);
	const [showComplete, setShowComplete] = useState(false);

	const translateX = useSharedValue(0);
	const translateY = useSharedValue(100);
	const opacity = useSharedValue(0);
	const scale = useSharedValue(1);

	useEffect(() => {
		if (isActive) {
			setIsVisible(true);
			setShowComplete(false);
			setIsMinimized(false);
			translateX.value = 0;
			translateY.value = withSpring(0, { damping: 20, stiffness: 300 });
			opacity.value = withTiming(1, { duration: 200 });
		} else if (isVisible && isComplete) {
			setShowComplete(true);
			const timer = setTimeout(() => {
				translateY.value = withTiming(100, { duration: 200 });
				opacity.value = withTiming(0, { duration: 200 }, () => {
					runOnJS(setIsVisible)(false);
					runOnJS(setShowComplete)(false);
				});
			}, COMPLETE_DISPLAY_DURATION);
			return () => clearTimeout(timer);
		} else if (!isActive && isVisible) {
			translateY.value = withTiming(100, { duration: 200 });
			opacity.value = withTiming(0, { duration: 200 }, () => {
				runOnJS(setIsVisible)(false);
			});
		}
	}, [isActive, isComplete, isVisible, translateX, translateY, opacity]);

	const handleMinimize = useCallback(() => {
		setIsMinimized(true);
		scale.value = withSpring(1, { damping: 15, stiffness: 300 });
	}, [scale]);

	const handleExpand = useCallback(() => {
		setIsMinimized(false);
		scale.value = withSpring(1, { damping: 15, stiffness: 300 });
	}, [scale]);

	const panGesture = Gesture.Pan()
		.onUpdate((event) => {
			if (isMinimized) return;
			translateX.value = event.translationX;
			translateY.value = Math.max(0, event.translationY);
		})
		.onEnd((event) => {
			if (isMinimized) return;

			const shouldMinimizeHorizontal =
				Math.abs(event.translationX) > SWIPE_THRESHOLD ||
				Math.abs(event.velocityX) > DISMISS_VELOCITY;
			const shouldMinimizeDown =
				event.translationY > SWIPE_THRESHOLD || event.velocityY > DISMISS_VELOCITY;

			if (shouldMinimizeHorizontal || shouldMinimizeDown) {
				translateX.value = withSpring(0, { damping: 20, stiffness: 300 });
				translateY.value = withSpring(0, { damping: 20, stiffness: 300 });
				runOnJS(handleMinimize)();
			} else {
				translateX.value = withSpring(0, { damping: 20, stiffness: 300 });
				translateY.value = withSpring(0, { damping: 20, stiffness: 300 });
			}
		});

	const animatedContainerStyle = useAnimatedStyle(() => ({
		transform: [{ translateX: translateX.value }, { translateY: translateY.value }],
		opacity: interpolate(
			Math.abs(translateX.value),
			[0, 200],
			[opacity.value, 0],
			Extrapolation.CLAMP
		),
	}));

	if (!isVisible) {
		return null;
	}

	if (isMinimized && !showComplete) {
		return (
			<ToastPill
				portalName={portalName}
				bottomOffset={bottomOffset}
				percentage={percentage}
				onExpand={handleExpand}
				animatedStyle={animatedContainerStyle}
			/>
		);
	}

	return (
		<ToastExpanded
			portalName={portalName}
			bottomOffset={bottomOffset}
			phaseMessage={phaseMessage}
			percentage={percentage}
			progressText={progressText}
			currentItemLabel={currentItemLabel}
			showComplete={showComplete}
			panGesture={panGesture}
			animatedStyle={animatedContainerStyle}
		/>
	);
});
