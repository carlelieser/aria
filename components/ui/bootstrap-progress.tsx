/**
 * BootstrapProgress Component
 *
 * Displays bootstrap initialization progress as animated dots/pills.
 * Designed for use within AnimatedSplash.
 */
import React, { memo, useCallback, useEffect, useRef } from 'react';
import { StyleSheet, View, Platform } from 'react-native';
import { Text } from 'react-native-paper';
import Animated, {
	useSharedValue,
	useAnimatedStyle,
	withSpring,
	withSequence,
	withTiming,
	interpolateColor,
	runOnJS,
	type SharedValue,
} from 'react-native-reanimated';
import type { M3ColorScheme } from '@/lib/theme/colors';
import {
	useCurrentBootstrapStage,
	useCompletedStageOrder,
	isStageCompleted,
	BOOTSTRAP_STAGES,
	type BootstrapStage,
} from '@/src/application/state/bootstrap-progress-store';

const IS_WEB = Platform.OS === 'web';
const DOT_SIZE = 10;
const DOT_GAP = 16;
const ACTIVE_DOT_WIDTH = 28;

interface BootstrapProgressProps {
	colors: M3ColorScheme;
	translateY: SharedValue<number>;
	screenHeight: number;
	onAllAnimationsComplete?: () => void;
	showLabel?: boolean;
}

interface ProgressDotProps {
	isCompleted: boolean;
	colors: M3ColorScheme;
	onAnimationComplete?: () => void;
}

function ProgressDot({ isCompleted, colors, onAnimationComplete }: ProgressDotProps) {
	const scale = useSharedValue(0);
	const width = useSharedValue(DOT_SIZE);
	const fillProgress = useSharedValue(0);
	const hasAnimated = useRef(false);
	const hasNotifiedComplete = useRef(false);

	// Entrance animation
	useEffect(() => {
		scale.value = withSpring(1, { damping: 15, stiffness: 300 });
	}, [scale]);

	// Fill animation when stage completes
	useEffect(() => {
		if (isCompleted && !hasAnimated.current) {
			hasAnimated.current = true;
			fillProgress.value = withTiming(1, { duration: 150 });
			width.value = withTiming(DOT_SIZE, { duration: 100 }, () => {
				if (!hasNotifiedComplete.current) {
					hasNotifiedComplete.current = true;
					if (onAnimationComplete) {
						runOnJS(onAnimationComplete)();
					}
				}
			});
		}
	}, [isCompleted, fillProgress, width, onAnimationComplete]);

	// Capture colors as local constants for the worklet
	const inactiveColor = colors.surfaceContainerHigh;
	const activeColor = colors.primary;

	const animatedStyle = useAnimatedStyle(() => {
		'worklet';
		return {
			width: width.value,
			transform: [{ scale: scale.value }],
			backgroundColor: interpolateColor(
				fillProgress.value,
				[0, 1],
				[inactiveColor, activeColor]
			),
		};
	}, [inactiveColor, activeColor]);

	return <Animated.View style={[styles.dot, animatedStyle]} />;
}

export const BootstrapProgress = memo(function BootstrapProgress({
	colors,
	translateY,
	screenHeight,
	onAllAnimationsComplete,
	showLabel = true,
}: BootstrapProgressProps) {
	const currentStage = useCurrentBootstrapStage();
	const completedOrder = useCompletedStageOrder();
	const animatedDotsCount = useRef(0);
	const hasCalledComplete = useRef(false);

	const displayStages = BOOTSTRAP_STAGES.filter((s) => s.id !== 'idle' && s.id !== 'ready') as {
		id: BootstrapStage;
		label: string;
		order: number;
	}[];

	const totalDots = displayStages.length;

	const handleDotAnimationComplete = useCallback(() => {
		animatedDotsCount.current += 1;
		if (animatedDotsCount.current >= totalDots && !hasCalledComplete.current) {
			hasCalledComplete.current = true;
			onAllAnimationsComplete?.();
		}
	}, [totalDots, onAllAnimationsComplete]);

	const currentStageInfo = BOOTSTRAP_STAGES.find((s) => s.id === currentStage);

	const containerStyle = useAnimatedStyle(() => ({
		opacity:
			translateY.value === 0 ? 1 : Math.max(0, 1 + translateY.value / (screenHeight / 3)),
	}));

	if (IS_WEB) {
		return (
			<View style={styles.container}>
				<View style={styles.dotsContainer}>
					{displayStages.map((stage) => (
						<View
							key={stage.id}
							style={[
								styles.dot,
								{
									backgroundColor: isStageCompleted(stage.id, completedOrder)
										? colors.primary
										: colors.surfaceContainerHigh,
									width: currentStage === stage.id ? ACTIVE_DOT_WIDTH : DOT_SIZE,
								},
							]}
						/>
					))}
				</View>
				{showLabel && currentStageInfo && currentStage !== 'ready' && currentStage !== 'idle' && (
					<Text variant="bodySmall" style={[styles.label, { color: colors.onSurface }]}>
						{currentStageInfo.label}
					</Text>
				)}
			</View>
		);
	}

	return (
		<Animated.View style={[styles.container, containerStyle]}>
			<View style={styles.dotsContainer}>
				{displayStages.map((stage) => (
					<ProgressDot
						key={stage.id}
						isCompleted={isStageCompleted(stage.id, completedOrder)}
						colors={colors}
						onAnimationComplete={handleDotAnimationComplete}
					/>
				))}
			</View>
			{showLabel && currentStageInfo && (
				<Text variant="bodySmall" style={[styles.label, { color: colors.onSurface }]}>
					{currentStageInfo.label}
				</Text>
			)}
		</Animated.View>
	);
});

const styles = StyleSheet.create({
	container: {
		alignItems: 'center',
		gap: 12,
	},
	dotsContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: DOT_GAP,
	},
	dot: {
		height: DOT_SIZE,
		borderRadius: DOT_SIZE / 2,
	},
	label: {
		textAlign: 'center',
		opacity: 0.7,
	},
});

export type { BootstrapProgressProps };
