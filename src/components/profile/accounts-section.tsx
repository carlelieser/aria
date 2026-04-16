/**
 * AccountsSection Component
 *
 * Displays connected accounts on the profile page.
 * Discovers OAuth-capable plugins and renders their auth status
 * using the existing PluginOAuthField component.
 */

import { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { BanIcon } from 'lucide-react-native';
import { SettingsSection } from '@/src/components/settings/settings-section';
import { SettingsItem } from '@/src/components/settings/settings-item';
import { PluginOAuthField } from '@/src/components/plugin/plugin-oauth-field';
import { usePluginManifests } from '@/src/hooks/use-plugin-registry';
import { getPluginConfigSchema } from '@/src/application/services/plugin-registry-facade';
import { useAppTheme } from '@/lib/theme';
import type { PluginConfigSchema } from '@shared/types/plugin-config-schema';

interface OAuthPluginEntry {
	readonly pluginId: string;
	readonly schema: PluginConfigSchema;
}

export function AccountsSection() {
	const { colors } = useAppTheme();
	const manifests = usePluginManifests();

	const oauthEntries = useMemo((): readonly OAuthPluginEntry[] => {
		const entries: OAuthPluginEntry[] = [];

		for (const manifest of manifests) {
			const schemas = getPluginConfigSchema(manifest.id);
			const oauthSchema = schemas.find((s) => s.type === 'oauth');

			if (oauthSchema) {
				entries.push({
					pluginId: manifest.id,
					schema: { ...oauthSchema, label: manifest.name },
				});
			}
		}

		return entries;
	}, [manifests]);

	if (oauthEntries.length === 0) return null;

	return (
		<SettingsSection title={'Accounts'}>
			{oauthEntries.map((entry) => (
				<PluginOAuthField
					key={entry.pluginId}
					schema={entry.schema}
					pluginId={entry.pluginId}
				/>
			))}
			<SettingsItem
				icon={BanIcon}
				iconUrl={
					'https://storage.googleapis.com/pr-newsroom-wp/1/2023/05/Spotify_Primary_Logo_RGB_Green.png'
				}
				title={'Spotify'}
				subtitleElement={
					<View style={styles.deprecationSubtitle}>
						<Text
							variant={'bodySmall'}
							style={{ color: colors.onSurfaceVariant }}
						>
							Unavailable — Spotify removed library and playlist API access in March 2026.
						</Text>
					</View>
				}
			/>
		</SettingsSection>
	);
}

const styles = StyleSheet.create({
	deprecationSubtitle: {
		flexShrink: 1,
	},
});
