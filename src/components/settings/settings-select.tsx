/**
 * SettingsSelect Component
 *
 * A settings row that opens an action sheet for selection.
 * Uses M3 theming.
 */

import { useState, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { type LucideIcon } from 'lucide-react-native';
import { Icon } from '@/src/components/ui/icon';
import { ActionSheet, type ActionSheetGroup } from '@/src/components/ui/action-sheet';
import { SettingsItem } from '@/src/components/settings/settings-item';
import { useAppTheme } from '@/lib/theme';

interface SelectOption<T extends string> {
	readonly value: T;
	readonly label: string;
	readonly icon?: LucideIcon;
}

interface SettingsSelectProps<T extends string> {
	readonly icon: LucideIcon;
	readonly title: string;
	readonly options: SelectOption<T>[];
	readonly value: T;
	readonly onValueChange: (value: T) => void;
	readonly portalName: string;
}

export function SettingsSelect<T extends string>({
	icon: IconComponent,
	title,
	options,
	value,
	onValueChange,
	portalName,
}: SettingsSelectProps<T>) {
	const { colors } = useAppTheme();
	const [isOpen, setIsOpen] = useState(false);

	const selectedOption = options.find((opt) => opt.value === value);
	const selectedLabel = selectedOption?.label ?? value;

	const handlePress = useCallback(() => {
		setIsOpen(true);
	}, []);

	const handleClose = useCallback(() => {
		setIsOpen(false);
	}, []);

	const handleSelect = useCallback(
		(itemId: string) => {
			onValueChange(itemId as T);
		},
		[onValueChange]
	);

	const groups: ActionSheetGroup[] = [
		{
			items: options.map((option) => ({
				id: option.value,
				label: option.label,
				icon: option.icon,
				checked: option.value === value,
			})),
		},
	];

	const header = (
		<View style={styles.header}>
			<Icon as={IconComponent} size={22} color={colors.onSurfaceVariant} />
			<Text variant={'titleMedium'} style={[styles.headerTitle, { color: colors.onSurface }]}>
				{title}
			</Text>
		</View>
	);

	return (
		<>
			<SettingsItem
				icon={IconComponent}
				title={title}
				subtitle={selectedLabel}
				onPress={handlePress}
				showChevron
			/>

			<ActionSheet
				isOpen={isOpen}
				groups={groups}
				onSelect={handleSelect}
				onClose={handleClose}
				header={header}
				portalName={portalName}
			/>
		</>
	);
}

const styles = StyleSheet.create({
	header: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12,
	},
	headerTitle: {
		fontWeight: '600',
	},
});
