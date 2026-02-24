/**
 * PresetButton Component
 *
 * A pressable button for selecting an equalizer preset.
 */

import { useCallback, memo } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { Check } from 'lucide-react-native';
import { Icon } from '@/src/components/ui/icon';
import { useAppTheme, M3Shapes } from '@/lib/theme';
import type { PresetButtonProps } from './types';

export const PresetButton = memo(function PresetButton({
	id,
	name,
	isSelected,
	isEnabled,
	onSelect,
}: PresetButtonProps) {
	const { colors } = useAppTheme();

	const handlePress = useCallback(() => {
		onSelect(id);
	}, [onSelect, id]);

	return (
		<Pressable
			onPress={handlePress}
			disabled={!isEnabled}
			style={({ pressed }) => [
				styles.presetButton,
				{
					backgroundColor: isSelected
						? colors.primaryContainer
						: pressed
							? colors.surfaceContainerHighest
							: colors.surfaceContainer,
					borderColor: isSelected ? colors.primary : colors.outline,
					opacity: isEnabled ? 1 : 0.5,
				},
			]}
		>
			<Text
				variant={'bodyMedium'}
				style={{
					color: isSelected ? colors.onPrimaryContainer : colors.onSurface,
					fontWeight: isSelected ? '600' : '400',
				}}
			>
				{name}
			</Text>
			{isSelected && <Icon as={Check} size={16} color={colors.onPrimaryContainer} />}
		</Pressable>
	);
});

const styles = StyleSheet.create({
	presetButton: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
		paddingVertical: 10,
		paddingHorizontal: 16,
		borderRadius: M3Shapes.medium,
		borderWidth: 1,
	},
});
