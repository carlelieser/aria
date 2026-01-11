/**
 * ScanProgressToast Component
 *
 * Shows real-time folder scanning progress as a toast notification.
 * Supports expanded and minimized (pill) states.
 */

import { memo, useEffect, useState, useCallback } from 'react';
import { StyleSheet, View, Pressable, ActivityIndicator } from 'react-native';
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
	Easing,
} from 'react-native-reanimated';
import { useAppTheme } from '@/lib/theme';
import { useToastPosition } from '@/hooks/use-toast-position';
import {
	useIsScanning,
	useScanProgress,
} from '@/src/plugins/metadata/local-library/storage/local-library-store';
import type { ScanProgress } from '@/src/plugins/metadata/local-library/types';

const SWIPE_THRESHOLD = 50;
const DISMISS_VELOCITY = 500;
const COMPLETE_DISPLAY_DURATION = 2000;

function getPhaseMessage(phase: ScanProgress['phase']): string {
	switch (phase) {
		case 'enumerating':
			return 'Finding music files...';
		case 'scanning':
			return 'Scanning music files...';
		case 'indexing':
			return 'Indexing library...';
		case 'complete':
			return 'Scan complete!';
		default:
			return 'Scanning...';
	}
}

function truncateFilename(filename: string | undefined, maxLength: number = 35): string {
	if (!filename) return '';
	if (filename.length <= maxLength) return filename;
	const extension = filename.split('.').pop() || '';
	const nameWithoutExt = filename.slice(0, filename.length - extension.length - 1);
	const truncatedName = nameWithoutExt.slice(0, maxLength - extension.length - 4);
	return `${truncatedName}...${extension}`;
}

export const ScanProgressToast = memo(function ScanProgressToast() {
	const { colors } = useAppTheme();
	const bottomOffset = useToastPosition();

	const isScanning = useIsScanning();
	const scanProgress = useScanProgress();

	const [isMinimized, setIsMinimized] = useState(false);
	const [isVisible, setIsVisible] = useState(false);
	const [showComplete, setShowComplete] = useState(false);

	const translateX = useSharedValue(0);
	const translateY = useSharedValue(100);
	const opacity = useSharedValue(0);
	const progressWidth = useSharedValue(0);
	const scale = useSharedValue(1);

	// Calculate progress percentage
	const percentage =
		scanProgress && scanProgress.total > 0
			? Math.round((scanProgress.current / scanProgress.total) * 100)
			: 0;

	// Animate progress bar
	useEffect(() => {
		progressWidth.value = withTiming(percentage, {
			duration: 300,
			easing: Easing.out(Easing.ease),
		});
	}, [percentage, progressWidth]);

	// Handle visibility based on scanning state
	useEffect(() => {
		if (isScanning) {
			setIsVisible(true);
			setShowComplete(false);
			setIsMinimized(false);
			translateX.value = 0;
			translateY.value = withSpring(0, { damping: 20, stiffness: 300 });
			opacity.value = withTiming(1, { duration: 200 });
		} else if (isVisible && scanProgress?.phase === 'complete') {
			setShowComplete(true);
			const timer = setTimeout(() => {
				translateY.value = withTiming(100, { duration: 200 });
				opacity.value = withTiming(0, { duration: 200 }, () => {
					runOnJS(setIsVisible)(false);
					runOnJS(setShowComplete)(false);
				});
			}, COMPLETE_DISPLAY_DURATION);
			return () => clearTimeout(timer);
		} else if (!isScanning && isVisible) {
			translateY.value = withTiming(100, { duration: 200 });
			opacity.value = withTiming(0, { duration: 200 }, () => {
				runOnJS(setIsVisible)(false);
			});
		}
	}, [isScanning, isVisible, scanProgress?.phase, translateX, translateY, opacity]);

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

	const animatedProgressStyle = useAnimatedStyle(() => ({
		width: `${progressWidth.value}%`,
	}));

	if (!isVisible) {
		return null;
	}

	const progressText =
		scanProgress && scanProgress.total > 0
			? `${scanProgress.current}/${scanProgress.total} files`
			: '';

	const currentFileName = truncateFilename(scanProgress?.currentFile);
	const phaseMessage = scanProgress ? getPhaseMessage(scanProgress.phase) : 'Scanning...';

	// Minimized pill view
	if (isMinimized && !showComplete) {
		return (
			<Portal name="scan-progress-toast">
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

	// Expanded toast view
	return (
		<Portal name="scan-progress-toast">
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
								<View
									style={[
										styles.progressTrack,
										{ backgroundColor: colors.primary + '33' },
									]}
								>
									<Animated.View
										style={[
											styles.progressBar,
											{ backgroundColor: colors.primary },
											animatedProgressStyle,
										]}
									/>
								</View>

								<View style={styles.footer}>
									<Text
										variant="bodySmall"
										style={{ color: colors.onPrimaryContainer, opacity: 0.8 }}
									>
										{progressText}
									</Text>
									{currentFileName && (
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
											{currentFileName}
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
	progressTrack: {
		height: 4,
		borderRadius: 2,
		overflow: 'hidden',
	},
	progressBar: {
		height: '100%',
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
