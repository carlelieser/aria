/**
 * Toast Component
 *
 * M3-compliant snackbar/toast using React Native Paper.
 * Integrates with the existing toast store.
 * Supports swipe-to-dismiss gestures.
 */

import React, { useEffect, useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { Portal } from '@rn-primitives/portal';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
	useSharedValue,
	useAnimatedStyle,
	withSpring,
	withTiming,
	runOnJS,
	interpolate,
	Extrapolation,
} from 'react-native-reanimated';
import {
	useCurrentToast,
	useToastStore,
	type Toast,
	type ToastVariant,
} from '@/src/application/state/toast-store';
import { useAppTheme } from '@/lib/theme';
import { useToastPosition } from '@/hooks/use-toast-position';

const SWIPE_THRESHOLD = 50;
const DISMISS_VELOCITY = 500;

/**
 * Get snackbar colors based on variant
 */
function getVariantColors(
	variant: ToastVariant,
	colors: ReturnType<typeof useAppTheme>['colors']
): { backgroundColor: string; textColor: string } {
	switch (variant) {
		case 'error':
			return {
				backgroundColor: colors.errorContainer,
				textColor: colors.onErrorContainer,
			};
		case 'success':
			return {
				backgroundColor: colors.primaryContainer,
				textColor: colors.onPrimaryContainer,
			};
		case 'warning':
			return {
				backgroundColor: colors.tertiaryContainer,
				textColor: colors.onTertiaryContainer,
			};
		case 'info':
			return {
				backgroundColor: colors.secondaryContainer,
				textColor: colors.onSecondaryContainer,
			};
		default:
			return {
				backgroundColor: colors.inverseSurface,
				textColor: colors.inverseOnSurface,
			};
	}
}

export function ToastContainer() {
	const currentToast = useCurrentToast();
	const dismiss = useToastStore((state) => state.dismiss);
	const { colors } = useAppTheme();
	const bottomOffset = useToastPosition();

	const translateX = useSharedValue(0);
	const translateY = useSharedValue(100);
	const opacity = useSharedValue(0);
	const [visibleToast, setVisibleToast] = useState<Toast | null>(currentToast ?? null);

	const handleDismiss = useCallback(() => {
		if (currentToast) {
			dismiss(currentToast.id);
		}
	}, [currentToast, dismiss]);

	// Animate in/out when toast changes
	useEffect(() => {
		if (currentToast) {
			setVisibleToast(currentToast);
			translateX.value = 0;
			translateY.value = withSpring(0, { damping: 20, stiffness: 300 });
			opacity.value = withTiming(1, { duration: 200 });

			// Auto-dismiss timer
			const timer = setTimeout(() => {
				handleDismiss();
			}, currentToast.duration ?? 4000);

			return () => clearTimeout(timer);
		} else if (visibleToast) {
			translateY.value = withTiming(100, { duration: 200 });
			opacity.value = withTiming(0, { duration: 200 }, () => {
				runOnJS(setVisibleToast)(null);
			});
		}
	}, [currentToast, handleDismiss, translateX, translateY, opacity, visibleToast]);

	const panGesture = Gesture.Pan()
		.onUpdate((event) => {
			translateX.value = event.translationX;
			translateY.value = Math.max(0, event.translationY);
		})
		.onEnd((event) => {
			const shouldDismissHorizontal =
				Math.abs(event.translationX) > SWIPE_THRESHOLD ||
				Math.abs(event.velocityX) > DISMISS_VELOCITY;
			const shouldDismissDown =
				event.translationY > SWIPE_THRESHOLD || event.velocityY > DISMISS_VELOCITY;

			if (shouldDismissHorizontal) {
				const direction = event.translationX > 0 ? 1 : -1;
				translateX.value = withTiming(direction * 400, { duration: 200 });
				opacity.value = withTiming(0, { duration: 200 }, () => {
					runOnJS(handleDismiss)();
				});
			} else if (shouldDismissDown) {
				translateY.value = withTiming(100, { duration: 200 });
				opacity.value = withTiming(0, { duration: 200 }, () => {
					runOnJS(handleDismiss)();
				});
			} else {
				translateX.value = withSpring(0, { damping: 20, stiffness: 300 });
				translateY.value = withSpring(0, { damping: 20, stiffness: 300 });
			}
		});

	const animatedStyle = useAnimatedStyle(() => ({
		transform: [{ translateX: translateX.value }, { translateY: translateY.value }],
		opacity: interpolate(
			Math.abs(translateX.value),
			[0, 200],
			[opacity.value, 0],
			Extrapolation.CLAMP
		),
	}));

	const variantColors = visibleToast
		? getVariantColors(visibleToast.variant, colors)
		: { backgroundColor: colors.inverseSurface, textColor: colors.inverseOnSurface };

	if (!visibleToast) {
		return null;
	}

	return (
		<Portal name="toast-container">
			<View style={[styles.container, { bottom: bottomOffset }]} pointerEvents="box-none">
				<GestureDetector gesture={panGesture}>
					<Animated.View
						style={[
							styles.toast,
							{ backgroundColor: variantColors.backgroundColor },
							animatedStyle,
						]}
					>
						<Text style={[styles.toastTitle, { color: variantColors.textColor }]}>
							{visibleToast.title}
						</Text>
						{visibleToast.description && (
							<Text style={[styles.toastDescription, { color: variantColors.textColor }]}>
								{visibleToast.description}
							</Text>
						)}
					</Animated.View>
				</GestureDetector>
			</View>
		</Portal>
	);
}

const styles = StyleSheet.create({
	container: {
		position: 'absolute',
		left: 16,
		right: 16,
	},
	toast: {
		paddingHorizontal: 16,
		paddingVertical: 14,
		borderRadius: 12,
		elevation: 6,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 3 },
		shadowOpacity: 0.15,
		shadowRadius: 8,
	},
	toastTitle: {
		fontSize: 14,
		fontWeight: '500',
		lineHeight: 20,
	},
	toastDescription: {
		fontSize: 12,
		lineHeight: 16,
		marginTop: 2,
		opacity: 0.9,
	},
});
