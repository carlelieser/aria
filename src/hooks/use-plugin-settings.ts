import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { PluginRegistry } from '@/src/plugins/core/registry/plugin-registry';
import { usePluginSettingsStore } from '@/src/application/state/plugin-settings-store';
import { validateConfigField } from '@/src/domain/utils/plugin-config-validation';

export function usePluginSettings(pluginId: string) {
	const updatePluginConfig = usePluginSettingsStore((state) => state.updatePluginConfig);
	const getPluginConfig = usePluginSettingsStore((state) => state.getPluginConfig);

	const configSchema = useMemo(() => {
		const registry = PluginRegistry.getInstance();
		const plugin = registry.getPlugin(pluginId);
		return plugin?.configSchema ?? [];
	}, [pluginId]);

	const [localValues, setLocalValues] = useState<Record<string, unknown>>({});
	const [errors, setErrors] = useState<Record<string, string>>({});
	const initializedRef = useRef<string | null>(null);

	useEffect(() => {
		if (initializedRef.current === pluginId) {
			return;
		}
		initializedRef.current = pluginId;

		const savedConfig = getPluginConfig(pluginId);
		const initialValues: Record<string, unknown> = {};
		for (const schema of configSchema) {
			initialValues[schema.key] = savedConfig[schema.key] ?? schema.defaultValue;
		}
		setLocalValues(initialValues);
		setErrors({});
	}, [pluginId, configSchema, getPluginConfig]);

	const handleChange = useCallback(
		(key: string, value: unknown) => {
			setLocalValues((prev) => ({ ...prev, [key]: value }));

			setErrors((prev) => {
				if (prev[key]) {
					const { [key]: _, ...rest } = prev;
					return rest;
				}
				return prev;
			});

			const schema = configSchema.find((s) => s.key === key);
			if (schema && (schema.type === 'boolean' || schema.type === 'select')) {
				const error = validateConfigField(schema, value);
				if (!error) {
					updatePluginConfig(pluginId, { [key]: value });
				}
			}
		},
		[configSchema, pluginId, updatePluginConfig]
	);

	const handleBlur = useCallback(
		(key: string) => {
			const schema = configSchema.find((s) => s.key === key);
			if (schema && (schema.type === 'string' || schema.type === 'number')) {
				const value = localValues[key];
				const error = validateConfigField(schema, value);

				if (error) {
					setErrors((prev) => ({ ...prev, [key]: error }));
				} else {
					const finalValue =
						schema.type === 'number' && value !== '' ? Number(value) : value;
					updatePluginConfig(pluginId, { [key]: finalValue });
				}
			}
		},
		[configSchema, localValues, pluginId, updatePluginConfig]
	);

	return {
		configSchema,
		values: localValues,
		errors,
		handleChange,
		handleBlur,
	};
}
