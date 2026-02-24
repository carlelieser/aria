/**
 * Plugin Configuration Schema
 *
 * Defines the shape of a single plugin configuration field.
 * Lives in shared/types so that both domain and plugin layers
 * can reference it without introducing prohibited dependencies.
 */

export interface PluginConfigSchema {
	readonly key: string;

	readonly type: 'string' | 'number' | 'boolean' | 'select' | 'folder-list' | 'oauth';

	readonly label: string;

	readonly description?: string;

	readonly defaultValue?: unknown;

	readonly required?: boolean;

	readonly options?: { label: string; value: unknown }[];

	readonly pattern?: string;

	readonly min?: number;

	readonly max?: number;

	readonly icon?: string;
}
