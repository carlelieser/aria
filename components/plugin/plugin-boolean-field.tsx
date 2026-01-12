/**
 * Plugin Boolean Field Component
 *
 * Toggle switch field for plugin configuration.
 */

import { memo, useMemo } from 'react';
import { Switch } from 'react-native-paper';
import * as LucideIcons from 'lucide-react-native';
import { CircleDotIcon, type LucideIcon } from 'lucide-react-native';
import { SettingsItem } from '@/components/settings/settings-item';
import type { PluginConfigSchema } from '@/src/plugins/core/interfaces/base-plugin';

const DEFAULT_BOOLEAN_ICON = CircleDotIcon;

interface PluginBooleanFieldProps {
	schema: PluginConfigSchema;
	value: boolean;
	onChange: (key: string, value: boolean) => void;
}

export const PluginBooleanField = memo(function PluginBooleanField({
	schema,
	value,
	onChange,
}: PluginBooleanFieldProps) {
	const IconComponent = useMemo((): LucideIcon => {
		const iconName = schema.icon ? `${schema.icon}Icon` : null;
		if (iconName && iconName in LucideIcons) {
			// eslint-disable-next-line import/namespace
			return LucideIcons[iconName as keyof typeof LucideIcons] as LucideIcon;
		}
		return DEFAULT_BOOLEAN_ICON;
	}, [schema.icon]);

	return (
		<SettingsItem
			icon={IconComponent}
			title={schema.label}
			subtitle={schema.description}
			rightElement={
				<Switch
					value={value ?? false}
					onValueChange={(newValue) => onChange(schema.key, newValue)}
				/>
			}
		/>
	);
});
