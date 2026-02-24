/**
 * LyricLine Component
 *
 * A single lyric line with animated scale and opacity transitions
 * based on active/past state.
 */

import { useEffect } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import Animated, {
	useSharedValue,
	useAnimatedStyle,
	withSpring,
	withTiming,
} from 'react-native-reanimated';
import { useAppTheme } from '@/lib/theme';
import type { LyricLineProps } from './types';

const LINE_HEIGHT = 32;

export function LyricLine({ text, isActive, isPast, onPress }: LyricLineProps) {
	const { colors } = useAppTheme();
	const scale = useSharedValue(1);
	const opacity = useSharedValue(isPast ? 0.5 : isActive ? 1 : 0.7);

	useEffect(() => {
		if (isActive) {
			scale.value = withSpring(1.05, { damping: 15, stiffness: 300 });
			opacity.value = withTiming(1, { duration: 200 });
		} else {
			scale.value = withSpring(1, { damping: 15, stiffness: 300 });
			opacity.value = withTiming(isPast ? 0.5 : 0.7, { duration: 200 });
		}
	}, [isActive, isPast, scale, opacity]);

	const animatedStyle = useAnimatedStyle(() => ({
		transform: [{ scale: scale.value }],
		opacity: opacity.value,
	}));

	const textColor = isActive ? colors.primary : colors.onSurface;

	return (
		<Pressable onPress={onPress}>
			<Animated.View style={[styles.lineContainer, animatedStyle]}>
				<Text
					variant={isActive ? 'titleMedium' : 'bodyLarge'}
					style={[
						styles.lineText,
						{
							color: textColor,
							fontWeight: isActive ? '700' : '400',
						},
					]}
				>
					{text || '\u266A'}
				</Text>
			</Animated.View>
		</Pressable>
	);
}

const styles = StyleSheet.create({
	lineContainer: {
		height: LINE_HEIGHT,
		justifyContent: 'center',
		paddingHorizontal: 16,
	},
	lineText: {
		textAlign: 'center',
	},
});
