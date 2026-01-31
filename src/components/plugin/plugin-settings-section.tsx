/**
 * Plugin Settings Section Component
 *
 * Renders plugin configuration fields based on the plugin's configSchema.
 * Shows a message if the plugin is not enabled.
 */

import { memo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { SettingsSection } from '@/components/settings/settings-section';
import { PluginConfigField } from './plugin-config-field';
import { usePluginSettings } from '@/hooks/use-plugin-settings';
import { useIsPluginEnabled } from '@/src/application/state/plugin-settings-store';
import { useAppTheme } from '@/lib/theme';

interface PluginSettingsSectionProps {
	pluginId: string;
}

export const PluginSettingsSection = memo(function PluginSettingsSection({
	pluginId,
}: PluginSettingsSectionProps) {
	const { colors } = useAppTheme();
	const isEnabled = useIsPluginEnabled(pluginId);
	const { configSchema, values, errors, handleChange, handleBlur } = usePluginSettings(pluginId);

	if (configSchema.length === 0) {
		return null;
	}

	if (!isEnabled) {
		return (
			<SettingsSection title="Configuration">
				<View style={styles.messageContainer}>
					<Text variant="bodyMedium" style={{ color: colors.onSurfaceVariant }}>
						Enable this plugin to configure its settings.
					</Text>
				</View>
			</SettingsSection>
		);
	}

	return (
		<SettingsSection title="Configuration">
			{configSchema.map((schema) => (
				<PluginConfigField
					key={schema.key}
					schema={schema}
					value={values[schema.key]}
					onChange={handleChange}
					onBlur={handleBlur}
					error={errors[schema.key]}
					pluginId={pluginId}
				/>
			))}
		</SettingsSection>
	);
});

const styles = StyleSheet.create({
	messageContainer: {
		padding: 16,
	},
});
