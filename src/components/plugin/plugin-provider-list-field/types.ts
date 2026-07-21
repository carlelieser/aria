/**
 * PluginProviderListField Types
 */

import type { PluginConfigSchema } from '@shared/types/plugin-config-schema';

/** Config value shape stored under the provider-list field's key. */
export interface ProviderListValue {
	readonly enabled: string[];
	readonly order: string[];
}

export interface PluginProviderListFieldProps {
	readonly schema: PluginConfigSchema;
	readonly value: ProviderListValue;
	readonly onChange: (key: string, value: ProviderListValue) => void;
	readonly pluginId: string;
}
