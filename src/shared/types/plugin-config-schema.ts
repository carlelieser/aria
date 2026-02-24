/**
 * Plugin Configuration Schema
 *
 * Defines the structure of plugin configuration fields.
 * Shared across layers: used by domain (validation), application (services),
 * and presentation (config UI components).
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
