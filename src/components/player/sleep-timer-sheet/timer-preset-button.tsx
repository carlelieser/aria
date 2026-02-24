/**
 * TimerPresetButton Component
 *
 * A pressable button for selecting a sleep timer duration preset.
 */

import { useCallback, memo } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { useAppTheme, M3Shapes } from '@/lib/theme';
import type { TimerPresetButtonProps } from './types';

export const TimerPresetButton = memo(function TimerPresetButton({
	minutes,
	label,
	onSelect,
}: TimerPresetButtonProps) {
	const { colors } = useAppTheme();

	const handlePress = useCallback(() => {
		onSelect(minutes);
	}, [onSelect, minutes]);

	return (
		<Pressable
			onPress={handlePress}
			style={({ pressed }) => [
				styles.presetButton,
				{
					backgroundColor: pressed
						? colors.surfaceContainerHighest
						: colors.surfaceContainer,
					borderColor: colors.outline,
				},
			]}
		>
			<Text variant={'titleMedium'} style={{ color: colors.onSurface, fontWeight: '500' }}>
				{label}
			</Text>
		</Pressable>
	);
});

const styles = StyleSheet.create({
	presetButton: {
		paddingVertical: 14,
		paddingHorizontal: 20,
		borderRadius: M3Shapes.medium,
		borderWidth: 1,
	},
});
