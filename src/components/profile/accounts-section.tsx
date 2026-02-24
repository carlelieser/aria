/**
 * AccountsSection Component
 *
 * Displays connected accounts on the profile page.
 * Discovers OAuth-capable plugins and renders their auth status
 * using the existing PluginOAuthField component.
 */

import { useMemo } from 'react';
import { SettingsSection } from '@/src/components/settings/settings-section';
import { PluginOAuthField } from '@/src/components/plugin/plugin-oauth-field';
import { usePluginManifests } from '@/src/hooks/use-plugin-registry';
import { getPluginConfigSchema } from '@/src/application/services/plugin-registry-facade';
import type { PluginConfigSchema } from '@shared/types/plugin-config-schema';

interface OAuthPluginEntry {
	readonly pluginId: string;
	readonly schema: PluginConfigSchema;
}

export function AccountsSection() {
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
		</SettingsSection>
	);
}
