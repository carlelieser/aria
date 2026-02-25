/**
 * ActionSheetItem
 *
 * A single action item row within the TrackOptionsSheet.
 */

import { View, Pressable } from 'react-native';
import { Text } from 'react-native-paper';
import { Check } from 'lucide-react-native';
import { Icon } from '@/src/components/ui/icon';
import type { ActionItem, ThemeColors } from './types';
import { styles } from './styles';

interface ActionSheetItemProps {
	readonly item: ActionItem;
	readonly onPress: () => void;
	readonly colors: ThemeColors;
}

export function ActionSheetItem({ item, onPress, colors }: ActionSheetItemProps) {
	const isDestructive = item.variant === 'destructive';
	const IconComponent = item.icon;

	const textColor = isDestructive ? colors.error : colors.onSurface;
	const iconColor = isDestructive ? colors.error : colors.onSurfaceVariant;

	return (
		<Pressable
			onPress={onPress}
			disabled={item.disabled}
			style={({ pressed }) => [
				styles.itemContainer,
				{
					backgroundColor: pressed ? colors.surfaceContainerHighest : 'transparent',
					opacity: item.disabled ? 0.5 : 1,
				},
			]}
		>
			<View style={styles.itemContent}>
				{IconComponent && (
					<View style={styles.iconWrapper}>
						<Icon
							as={IconComponent}
							size={22}
							color={iconColor}
							fill={item.iconFill ? iconColor : 'transparent'}
						/>
					</View>
				)}
				<Text
					variant={'bodyLarge'}
					style={[styles.itemText, { color: textColor }]}
					numberOfLines={1}
				>
					{item.label}
				</Text>
				{item.checked && (
					<View style={styles.checkWrapper}>
						<Icon as={Check} size={20} color={colors.primary} />
					</View>
				)}
			</View>
		</Pressable>
	);
}
