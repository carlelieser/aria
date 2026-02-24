/**
 * WavyPlayButton Component
 *
 * Unified play/pause button where a wavy SVG shape IS the button background.
 * Idle: small filled wavy circle (4 peaks, no stroke).
 * Loading: smoothly grows to a larger wavy shape with morphing peaks, rotation, and visible stroke.
 */

import { memo } from 'react';
import { Pressable, View, StyleSheet } from 'react-native';
import Animated, { useAnimatedProps, useAnimatedStyle } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import { Play, Pause } from 'lucide-react-native';
import { ICON_SIZE, buildWavyCirclePath } from './constants';
import { useWavyAnimation } from './use-wavy-animation';
import type { WavyPlayButtonProps } from './types';

export type { WavyPlayButtonProps } from './types';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const AnimatedPath = Animated.createAnimatedComponent(Path);

export const WavyPlayButton = memo(function WavyPlayButton({
	isLoading,
	isPlaying,
	onPress,
	color,
	iconColor,
	size,
}: WavyPlayButtonProps) {
	const {
		canvasSize,
		center,
		targetRadius,
		targetAmplitude,
		ampScale,
		peaks,
		phase,
		strokeAnim,
		containerSize,
	} = useWavyAnimation({ isLoading, isPlaying, size });

	const animatedProps = useAnimatedProps(() => ({
		d: buildWavyCirclePath(
			center,
			center,
			targetRadius.value,
			targetAmplitude.value * ampScale.value,
			peaks.value,
			phase.value
		),
		strokeWidth: strokeAnim.value,
	}));

	const iconSize = ICON_SIZE[size];

	const pressableStyle = useAnimatedStyle(() => ({
		width: containerSize.value,
		height: containerSize.value,
		borderRadius: containerSize.value / 2,
	}));

	return (
		<View style={[styles.layoutWrapper, { width: canvasSize, height: canvasSize }]}>
			<Svg width={canvasSize} height={canvasSize} style={styles.svg}>
				<AnimatedPath
					animatedProps={animatedProps}
					stroke={color}
					strokeLinejoin={'round'}
					fill={color}
				/>
			</Svg>
			<AnimatedPressable onPress={onPress} style={[styles.pressable, pressableStyle]}>
				<View style={styles.iconOverlay}>
					{isPlaying && !isLoading ? (
						<Pause size={iconSize} color={iconColor} fill={iconColor} />
					) : (
						<Play size={iconSize} color={iconColor} fill={iconColor} />
					)}
				</View>
			</AnimatedPressable>
		</View>
	);
});

const styles = StyleSheet.create({
	layoutWrapper: {
		alignItems: 'center',
		justifyContent: 'center',
	},
	svg: {
		position: 'absolute',
	},
	pressable: {
		alignItems: 'center',
		justifyContent: 'center',
	},
	iconOverlay: {
		...StyleSheet.absoluteFillObject,
		alignItems: 'center',
		justifyContent: 'center',
	},
});
