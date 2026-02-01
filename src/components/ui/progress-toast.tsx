/**
 * ProgressToast Component
 *
 * Generic toast notification for background operations with progress tracking.
 * Supports expanded and minimized (pill) states with swipe-to-minimize gestures.
 */

import { memo, useEffect, useState, useCallback } from 'react';
import { StyleSheet, View, Pressable, ActivityIndicator } from 'react-native';
import { Text, ProgressBar } from 'react-native-paper';
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
import { useAppTheme } from '@/lib/theme';
import { useToastPosition } from '@/src/hooks/use-toast-position';

const SWIPE_THRESHOLD = 50;
const DISMISS_VELOCITY = 500;
const COMPLETE_DISPLAY_DURATION = 2000;

interface ProgressToastProps {
	/** Unique portal name for toast positioning */
	readonly portalName: string;
	/** Whether the background operation is currently running */
	readonly isActive: boolean;
	/** Whether the operation has completed (triggers auto-dismiss) */
	readonly isComplete: boolean;
	/** Human-readable phase description, e.g. "Scanning music files..." */
	readonly phaseMessage: string;
	/** 0-100 progress percentage */
	readonly percentage: number;
	/** Formatted count text, e.g. "5/10 files" or "5/10" */
	readonly progressText: string;
	/** Truncated current item label, or null if unavailable */
	readonly currentItemLabel: string | null;
}

export const ProgressToast = memo(function ProgressToast({
	portalName,
	isActive,
	isComplete,
	phaseMessage,
	percentage,
	progressText,
	currentItemLabel,
}: ProgressToastProps) {
	const { colors } = useAppTheme();
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
			<Portal name={portalName}>
				<View style={[styles.container, { bottom: bottomOffset }]} pointerEvents="box-none">
					<Animated.View style={animatedContainerStyle}>
						<Pressable
							onPress={handleExpand}
							style={[styles.pill, { backgroundColor: colors.primaryContainer }]}
						>
							<ActivityIndicator size="small" color={colors.onPrimaryContainer} />
							<Text
								variant="labelMedium"
								style={[styles.pillText, { color: colors.onPrimaryContainer }]}
							>
								{percentage}%
							</Text>
						</Pressable>
					</Animated.View>
				</View>
			</Portal>
		);
	}

	return (
		<Portal name={portalName}>
			<View style={[styles.container, { bottom: bottomOffset }]} pointerEvents="box-none">
				<GestureDetector gesture={panGesture}>
					<Animated.View
						style={[
							styles.toast,
							{ backgroundColor: colors.primaryContainer },
							animatedContainerStyle,
						]}
					>
						<View style={styles.header}>
							<Text variant="labelLarge" style={{ color: colors.onPrimaryContainer }}>
								{phaseMessage}
							</Text>
							{!showComplete && (
								<Text
									variant="labelMedium"
									style={{ color: colors.onPrimaryContainer }}
								>
									{percentage}%
								</Text>
							)}
						</View>

						{!showComplete && (
							<>
								<ProgressBar
									progress={percentage / 100}
									color={colors.primary}
									style={styles.progressBar}
								/>

								<View style={styles.footer}>
									<Text
										variant="bodySmall"
										style={{ color: colors.onPrimaryContainer, opacity: 0.8 }}
									>
										{progressText}
									</Text>
									{currentItemLabel && (
										<Text
											variant="bodySmall"
											numberOfLines={1}
											style={{
												color: colors.onPrimaryContainer,
												opacity: 0.8,
												flex: 1,
												textAlign: 'right',
											}}
										>
											{currentItemLabel}
										</Text>
									)}
								</View>
							</>
						)}
					</Animated.View>
				</GestureDetector>
			</View>
		</Portal>
	);
});

const styles = StyleSheet.create({
	container: {
		position: 'absolute',
		left: 16,
		right: 16,
		alignItems: 'flex-end',
	},
	toast: {
		width: '100%',
		paddingHorizontal: 16,
		paddingVertical: 12,
		borderRadius: 12,
		gap: 8,
		elevation: 6,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 3 },
		shadowOpacity: 0.15,
		shadowRadius: 8,
	},
	header: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
	},
	progressBar: {
		height: 4,
		borderRadius: 2,
	},
	footer: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		gap: 8,
	},
	pill: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingHorizontal: 12,
		paddingVertical: 8,
		borderRadius: 20,
		gap: 8,
		elevation: 6,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 3 },
		shadowOpacity: 0.15,
		shadowRadius: 8,
	},
	pillText: {
		fontWeight: '600',
	},
});
