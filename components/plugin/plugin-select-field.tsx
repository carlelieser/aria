/**
 * Plugin Select Field Component
 *
 * Dropdown select field for plugin configuration.
 */

import { memo, useState, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { ListIcon } from 'lucide-react-native';
import { Icon } from '@/components/ui/icon';
import { SettingsItem } from '@/components/settings/settings-item';
import { ActionSheet, type ActionSheetGroup } from '@/components/ui/action-sheet';
import { useAppTheme } from '@/lib/theme';
import type { PluginConfigSchema } from '@/src/plugins/core/interfaces/base-plugin';

interface PluginSelectFieldProps {
	schema: PluginConfigSchema;
	value: string;
	onChange: (key: string, value: string) => void;
	pluginId: string;
}

export const PluginSelectField = memo(function PluginSelectField({
	schema,
	value,
	onChange,
	pluginId,
}: PluginSelectFieldProps) {
	const { colors } = useAppTheme();
	const [isOpen, setIsOpen] = useState(false);

	const options = schema.options ?? [];
	const selectedOption = options.find((opt) => String(opt.value) === value);
	const selectedLabel = selectedOption?.label ?? value ?? 'Select...';

	const handlePress = useCallback(() => {
		setIsOpen(true);
	}, []);

	const handleClose = useCallback(() => {
		setIsOpen(false);
	}, []);

	const handleSelect = useCallback(
		(itemId: string) => {
			onChange(schema.key, itemId);
		},
		[onChange, schema.key]
	);

	const groups: ActionSheetGroup[] = [
		{
			items: options.map((option) => ({
				id: String(option.value),
				label: option.label,
				checked: String(option.value) === value,
			})),
		},
	];

	const header = (
		<View style={styles.header}>
			<Icon as={ListIcon} size={22} color={colors.onSurfaceVariant} />
			<Text variant="titleMedium" style={[styles.headerTitle, { color: colors.onSurface }]}>
				{schema.label}
			</Text>
		</View>
	);

	return (
		<>
			<SettingsItem
				icon={ListIcon}
				title={schema.label}
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
				portalName={`plugin-${pluginId}-${schema.key}`}
			/>
		</>
	);
});

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
