/**
 * Plugin Configuration Validation Utilities
 *
 * Validates plugin config values against their schema definitions.
 */

import type { PluginConfigSchema } from '@/src/plugins/core/interfaces/base-plugin';

/**
 * Validates a single config field value against its schema.
 * Returns an error message string if invalid, undefined if valid.
 */
export function validateConfigField(
	schema: PluginConfigSchema,
	value: unknown
): string | undefined {
	const isEmpty = value === undefined || value === null || value === '';

	if (schema.required && isEmpty) {
		return `${schema.label} is required`;
	}

	if (isEmpty) {
		return undefined;
	}

	switch (schema.type) {
		case 'string':
			if (typeof value !== 'string') {
				return `${schema.label} must be text`;
			}
			if (schema.pattern) {
				const regex = new RegExp(schema.pattern);
				if (!regex.test(value)) {
					return `Invalid format for ${schema.label}`;
				}
			}
			break;

		case 'number': {
			const num = typeof value === 'number' ? value : Number(value);
			if (isNaN(num)) {
				return `${schema.label} must be a number`;
			}
			if (schema.min !== undefined && num < schema.min) {
				return `${schema.label} must be at least ${schema.min}`;
			}
			if (schema.max !== undefined && num > schema.max) {
				return `${schema.label} must be at most ${schema.max}`;
			}
			break;
		}

		case 'boolean':
			if (typeof value !== 'boolean') {
				return `${schema.label} must be true or false`;
			}
			break;

		case 'select':
			if (schema.options) {
				const validValues = schema.options.map((o) => o.value);
				if (!validValues.includes(value)) {
					return `Invalid selection for ${schema.label}`;
				}
			}
			break;

		case 'folder-list':
			// Folder lists are managed separately in the local library store
			// No additional validation needed here
			break;
	}

	return undefined;
}

/**
 * Validates all config fields against their schemas.
 * Returns validation result with all errors.
 */
export function validateAllFields(
	schemas: PluginConfigSchema[],
	values: Record<string, unknown>
): { isValid: boolean; errors: Record<string, string> } {
	const errors: Record<string, string> = {};

	for (const schema of schemas) {
		const error = validateConfigField(schema, values[schema.key]);
		if (error) {
			errors[schema.key] = error;
		}
	}

	return {
		isValid: Object.keys(errors).length === 0,
		errors,
	};
}
