/**
 * EqualizerBand Component
 *
 * Visual representation of a single equalizer frequency band
 * with animated gain bar.
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import Animated, { useAnimatedStyle, withSpring, useSharedValue } from 'react-native-reanimated';
import { useAppTheme } from '@/lib/theme';
import type { EqualizerBandProps } from './types';

export function EqualizerBand({ label, gain, isEnabled }: EqualizerBandProps) {
	const { colors } = useAppTheme();
	const animatedHeight = useSharedValue(gain);

	React.useEffect(() => {
		animatedHeight.value = withSpring(gain, { damping: 15, stiffness: 200 });
	}, [gain, animatedHeight]);

	const barAnimatedStyle = useAnimatedStyle(() => {
		const normalizedGain = (animatedHeight.value + 12) / 24;
		const height = Math.max(4, normalizedGain * 100);

		return {
			height: `${height}%`,
		};
	});

	return (
		<View style={styles.bandContainer}>
			<View style={[styles.bandTrack, { backgroundColor: colors.surfaceContainerHighest }]}>
				<Animated.View
					style={[
						styles.bandBar,
						barAnimatedStyle,
						{
							backgroundColor: isEnabled ? colors.primary : colors.outline,
						},
					]}
				/>
			</View>
			<Text variant={'labelSmall'} style={{ color: colors.onSurfaceVariant, marginTop: 4 }}>
				{label}
			</Text>
			<Text
				variant={'labelSmall'}
				style={{
					color: gain === 0 ? colors.onSurfaceVariant : colors.primary,
					fontWeight: '600',
				}}
			>
				{gain > 0 ? `+${gain}` : gain}
			</Text>
		</View>
	);
}

const styles = StyleSheet.create({
	bandContainer: {
		alignItems: 'center',
		flex: 1,
	},
	bandTrack: {
		width: 8,
		flex: 1,
		borderRadius: 4,
		justifyContent: 'flex-end',
		overflow: 'hidden',
	},
	bandBar: {
		width: '100%',
		borderRadius: 4,
	},
});
