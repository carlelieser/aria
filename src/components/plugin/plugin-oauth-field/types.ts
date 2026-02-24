/**
 * PluginOAuthField Types
 *
 * Props interface for the plugin OAuth authentication field.
 */

import type { PluginConfigSchema } from '@/src/plugins/core/interfaces/base-plugin';

export interface PluginOAuthFieldProps {
	readonly schema: PluginConfigSchema;
	readonly pluginId: string;
}
