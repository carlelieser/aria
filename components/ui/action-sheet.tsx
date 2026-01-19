/**
 * ActionSheet Component
 *
 * Bottom sheet menu using @gorhom/bottom-sheet with M3 theming.
 */

import React, { useCallback, useRef, useEffect } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import BottomSheet, {
	BottomSheetBackdrop,
	BottomSheetView,
	type BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';
import type { BottomSheetMethods } from '@gorhom/bottom-sheet/lib/typescript/types';
import { Portal } from '@rn-primitives/portal';
import { Text, Divider } from 'react-native-paper';
import { Icon } from '@/components/ui/icon';
import { Check } from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import { useAppTheme, M3Shapes } from '@/lib/theme';

export interface ActionSheetItem {
	id: string;
	label: string;
	icon?: LucideIcon;
	variant?: 'default' | 'destructive';
	disabled?: boolean;
	checked?: boolean;
}

export interface ActionSheetGroup {
	items: ActionSheetItem[];
}

interface ActionSheetProps {
	isOpen: boolean;
	groups: ActionSheetGroup[];
	onSelect: (itemId: string) => void;
	onClose: () => void;
	header?: React.ReactNode;
	portalName: string;
}

export function ActionSheet({
	isOpen,
	groups,
	onSelect,
	onClose,
	header,
	portalName,
}: ActionSheetProps) {
	const { colors } = useAppTheme();
	const sheetRef = useRef<BottomSheetMethods>(null);

	useEffect(() => {
		if (isOpen) {
			sheetRef.current?.snapToIndex(0);
		}
	}, [isOpen]);

	const handleSheetChanges = useCallback(
		(index: number) => {
			if (index === -1) {
				onClose();
			}
		},
		[onClose]
	);

	const renderBackdrop = useCallback(
		(props: BottomSheetBackdropProps) => (
			<BottomSheetBackdrop
				{...props}
				disappearsOnIndex={-1}
				appearsOnIndex={0}
				opacity={0.5}
			/>
		),
		[]
	);

	const handleItemPress = useCallback(
		(itemId: string) => {
			onSelect(itemId);
			sheetRef.current?.close();
		},
		[onSelect]
	);

	if (!isOpen) {
		return null;
	}

	return (
		<Portal name={`action-sheet-${portalName}`}>
			<BottomSheet
				ref={sheetRef}
				index={0}
				enableDynamicSizing
				enablePanDownToClose
				backdropComponent={renderBackdrop}
				onChange={handleSheetChanges}
				backgroundStyle={[
					styles.background,
					{ backgroundColor: colors.surfaceContainerHigh },
				]}
				handleIndicatorStyle={[
					styles.handleIndicator,
					{ backgroundColor: colors.outlineVariant },
				]}
			>
				<BottomSheetView style={styles.contentContainer}>
					{header && <View style={styles.header}>{header}</View>}

					<Divider style={{ backgroundColor: colors.outlineVariant }} />

					{groups.map((group, groupIndex) => (
						<View key={groupIndex}>
							{groupIndex > 0 && (
								<Divider
									style={[
										styles.separator,
										{ backgroundColor: colors.outlineVariant },
									]}
								/>
							)}
							{group.items.map((item) => (
								<ActionSheetItemComponent
									key={item.id}
									item={item}
									onSelect={handleItemPress}
									colors={colors}
								/>
							))}
						</View>
					))}

					<View style={styles.bottomPadding} />
				</BottomSheetView>
			</BottomSheet>
		</Portal>
	);
}

interface ActionSheetItemComponentProps {
	item: ActionSheetItem;
	onSelect: (itemId: string) => void;
	colors: ReturnType<typeof useAppTheme>['colors'];
}

const ActionSheetItemComponent = React.memo(function ActionSheetItemComponent({
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
					variant="bodyLarge"
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
	background: {
		borderTopLeftRadius: M3Shapes.extraLarge,
		borderTopRightRadius: M3Shapes.extraLarge,
	},
	handleIndicator: {
		width: 36,
		height: 4,
		borderRadius: 2,
	},
	contentContainer: {},
	header: {
		paddingHorizontal: 24,
		paddingVertical: 16,
	},
	separator: {
		marginVertical: 8,
		marginHorizontal: 16,
	},
	bottomPadding: {
		height: 34,
	},
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
