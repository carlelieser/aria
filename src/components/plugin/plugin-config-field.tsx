/**
 * Plugin Config Field Component
 *
 * Polymorphic field renderer that dispatches to appropriate field component
 * based on the config schema type.
 */

import { memo } from 'react';
import type { PluginConfigSchema } from '@/src/plugins/core/interfaces/base-plugin';
import { PluginTextField } from './plugin-text-field';
import { PluginBooleanField } from './plugin-boolean-field';
import { PluginSelectField } from './plugin-select-field';
import { PluginFolderListField } from './plugin-folder-list-field';
import { PluginOAuthField } from './plugin-oauth-field';

interface PluginConfigFieldProps {
	schema: PluginConfigSchema;
	value: unknown;
	onChange: (key: string, value: unknown) => void;
	onBlur: (key: string) => void;
	error?: string;
	pluginId: string;
}

export const PluginConfigField = memo(function PluginConfigField({
	schema,
	value,
	onChange,
	onBlur,
	error,
	pluginId,
}: PluginConfigFieldProps) {
	switch (schema.type) {
		case 'string':
		case 'number':
			return (
				<PluginTextField
					schema={schema}
					value={String(value ?? '')}
					onChange={onChange}
					onBlur={onBlur}
					error={error}
				/>
			);

		case 'boolean':
			return (
				<PluginBooleanField schema={schema} value={Boolean(value)} onChange={onChange} />
			);

		case 'select':
			return (
				<PluginSelectField
					schema={schema}
					value={String(value ?? '')}
					onChange={onChange}
					pluginId={pluginId}
				/>
			);

		case 'folder-list':
			return <PluginFolderListField schema={schema} pluginId={pluginId} />;

		case 'oauth':
			return <PluginOAuthField schema={schema} pluginId={pluginId} />;

		default:
			return null;
	}
});
