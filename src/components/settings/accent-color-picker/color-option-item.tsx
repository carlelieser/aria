/**
 * ColorOptionItem
 *
 * A selectable color option row for the accent color picker.
 */

import { memo, useCallback } from 'react';
import { View, Pressable } from 'react-native';
import { Text } from 'react-native-paper';
import { Check } from 'lucide-react-native';
import { Icon } from '@/src/components/ui/icon';
import type { ThemeColors } from './types';
import { styles } from './styles';

interface ColorOptionItemProps {
	readonly colorValue: string;
	readonly label: string;
	readonly isSelected: boolean;
	readonly onSelect: (color: string | null) => void;
	readonly colors: ThemeColors;
}

export const ColorOptionItem = memo(function ColorOptionItem({
	colorValue,
	label,
	isSelected,
	onSelect,
	colors,
}: ColorOptionItemProps) {
	const handlePress = useCallback(() => {
		onSelect(colorValue);
	}, [onSelect, colorValue]);

	return (
		<Pressable
			onPress={handlePress}
			style={({ pressed }) => [
				styles.itemContainer,
				{
					backgroundColor: pressed ? colors.surfaceContainerHighest : 'transparent',
				},
			]}
		>
			<View style={styles.itemContent}>
				<View style={[styles.colorIndicator, { backgroundColor: colorValue }]} />
				<Text variant={'bodyLarge'} style={[styles.itemText, { color: colors.onSurface }]}>
					{label}
				</Text>
				{isSelected && (
					<View style={styles.checkWrapper}>
						<Icon as={Check} size={20} color={colors.primary} />
					</View>
				)}
			</View>
		</Pressable>
	);
});
