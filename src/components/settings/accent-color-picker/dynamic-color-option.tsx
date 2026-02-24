/**
 * DynamicColorOption
 *
 * A selectable option for the dynamic/Material You color.
 */

import { memo, useCallback } from 'react';
import { View, Pressable } from 'react-native';
import { Text } from 'react-native-paper';
import { Check } from 'lucide-react-native';
import { Icon } from '@/src/components/ui/icon';
import { DYNAMIC_COLOR } from './types';
import type { ThemeColors } from './types';
import { styles } from './styles';

interface DynamicColorOptionProps {
	readonly isSelected: boolean;
	readonly onSelect: (color: null) => void;
	readonly dynamicColor: string;
	readonly colors: ThemeColors;
}

export const DynamicColorOption = memo(function DynamicColorOption({
	isSelected,
	onSelect,
	dynamicColor,
	colors,
}: DynamicColorOptionProps) {
	const handlePress = useCallback(() => {
		onSelect(null);
	}, [onSelect]);

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
				<View style={[styles.colorIndicator, { backgroundColor: dynamicColor }]} />
				<Text variant={'bodyLarge'} style={[styles.itemText, { color: colors.onSurface }]}>
					{DYNAMIC_COLOR.label}
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
