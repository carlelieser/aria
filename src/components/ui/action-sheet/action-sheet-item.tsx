/**
 * ActionSheetItem Component
 *
 * A single pressable row within an action sheet group.
 */

import React, { useCallback } from 'react';
import { Pressable, View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { Check } from 'lucide-react-native';
import { Icon } from '@/src/components/ui/icon';
import { M3Shapes } from '@/lib/theme';
import type { useAppTheme } from '@/lib/theme';
import type { ActionSheetItem } from './types';

interface ActionSheetItemComponentProps {
	readonly item: ActionSheetItem;
	readonly onSelect: (itemId: string) => void;
	readonly colors: ReturnType<typeof useAppTheme>['colors'];
}

export const ActionSheetItemComponent = React.memo(function ActionSheetItemComponent({
	item,
	onSelect,
	colors,
}: ActionSheetItemComponentProps) {
	const handlePress = useCallback(() => {
		onSelect(item.id);
	}, [onSelect, item.id]);
	const isDestructive = item.variant === 'destructive';
	const IconComponent = item.icon;

	const textColor = isDestructive ? colors.error : colors.onSurface;
	const iconColor = isDestructive ? colors.error : colors.onSurfaceVariant;

	return (
		<Pressable
			onPress={handlePress}
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
						<Icon as={IconComponent} size={22} color={iconColor} />
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
});

const styles = StyleSheet.create({
	itemContainer: {
		borderRadius: M3Shapes.medium,
		marginHorizontal: 8,
	},
	itemContent: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingVertical: 14,
		paddingHorizontal: 14,
	},
	iconWrapper: {
		width: 24,
		height: 24,
		alignItems: 'center',
		justifyContent: 'center',
		marginRight: 16,
	},
	itemText: {
		flex: 1,
	},
	checkWrapper: {
		width: 24,
		height: 24,
		alignItems: 'center',
		justifyContent: 'center',
		marginLeft: 8,
	},
});
