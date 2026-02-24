import { describe, it, expect } from 'vitest';
import { validateConfigField, validateAllFields } from '@domain/utils/plugin-config-validation';

interface PluginConfigSchema {
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

function makeSchema(overrides: Partial<PluginConfigSchema> = {}): PluginConfigSchema {
	return {
		key: 'testField',
		type: 'string',
		label: 'Test Field',
		...overrides,
	};
}

describe('plugin-config-validation', () => {
	describe('validateConfigField', () => {
		describe('required fields', () => {
			it('should return error when required field is undefined', () => {
				const schema = makeSchema({ required: true });

				const result = validateConfigField(schema, undefined);

				expect(result).toBe('Test Field is required');
			});

			it('should return error when required field is null', () => {
				const schema = makeSchema({ required: true });

				const result = validateConfigField(schema, null);

				expect(result).toBe('Test Field is required');
			});

			it('should return error when required field is empty string', () => {
				const schema = makeSchema({ required: true });

				const result = validateConfigField(schema, '');

				expect(result).toBe('Test Field is required');
			});

			it('should return undefined when required field has value', () => {
				const schema = makeSchema({ required: true });

				const result = validateConfigField(schema, 'valid');

				expect(result).toBeUndefined();
			});
		});

		describe('optional fields', () => {
			it('should return undefined when optional field is empty', () => {
				const schema = makeSchema({ required: false });

				const result = validateConfigField(schema, undefined);

				expect(result).toBeUndefined();
			});

			it('should return undefined when optional field is null', () => {
				const schema = makeSchema({ required: false });

				const result = validateConfigField(schema, null);

				expect(result).toBeUndefined();
			});
		});

		describe('string type', () => {
			it('should return undefined for valid string', () => {
				const schema = makeSchema({ type: 'string' });

				const result = validateConfigField(schema, 'hello');

				expect(result).toBeUndefined();
			});

			it('should return error when value is not a string', () => {
				const schema = makeSchema({ type: 'string' });

				const result = validateConfigField(schema, 42);

				expect(result).toBe('Test Field must be text');
			});

			it('should validate against pattern when provided', () => {
				const schema = makeSchema({ type: 'string', pattern: '^[a-z]+$' });

				const result = validateConfigField(schema, 'ABC');

				expect(result).toBe('Invalid format for Test Field');
			});

			it('should return undefined when value matches pattern', () => {
				const schema = makeSchema({ type: 'string', pattern: '^[a-z]+$' });

				const result = validateConfigField(schema, 'abc');

				expect(result).toBeUndefined();
			});
		});

		describe('number type', () => {
			it('should return undefined for valid number', () => {
				const schema = makeSchema({ type: 'number' });

				const result = validateConfigField(schema, 42);

				expect(result).toBeUndefined();
			});

			it('should return error for non-numeric value', () => {
				const schema = makeSchema({ type: 'number' });

				const result = validateConfigField(schema, 'not-a-number');

				expect(result).toBe('Test Field must be a number');
			});

			it('should accept numeric strings', () => {
				const schema = makeSchema({ type: 'number' });

				const result = validateConfigField(schema, '42');

				expect(result).toBeUndefined();
			});

			it('should return error when below min', () => {
				const schema = makeSchema({ type: 'number', min: 10 });

				const result = validateConfigField(schema, 5);

				expect(result).toBe('Test Field must be at least 10');
			});

			it('should return error when above max', () => {
				const schema = makeSchema({ type: 'number', max: 100 });

				const result = validateConfigField(schema, 150);

				expect(result).toBe('Test Field must be at most 100');
			});

			it('should return undefined when within range', () => {
				const schema = makeSchema({ type: 'number', min: 0, max: 100 });

				const result = validateConfigField(schema, 50);

				expect(result).toBeUndefined();
			});

			it('should accept value equal to min', () => {
				const schema = makeSchema({ type: 'number', min: 10 });

				const result = validateConfigField(schema, 10);

				expect(result).toBeUndefined();
			});

			it('should accept value equal to max', () => {
				const schema = makeSchema({ type: 'number', max: 100 });

				const result = validateConfigField(schema, 100);

				expect(result).toBeUndefined();
			});
		});

		describe('boolean type', () => {
			it('should return undefined for true', () => {
				const schema = makeSchema({ type: 'boolean' });

				const result = validateConfigField(schema, true);

				expect(result).toBeUndefined();
			});

			it('should return undefined for false', () => {
				const schema = makeSchema({ type: 'boolean' });

				const result = validateConfigField(schema, false);

				expect(result).toBeUndefined();
			});

			it('should return error for non-boolean value', () => {
				const schema = makeSchema({ type: 'boolean' });

				const result = validateConfigField(schema, 'true');

				expect(result).toBe('Test Field must be true or false');
			});
		});

		describe('select type', () => {
			it('should return undefined for valid option value', () => {
				const schema = makeSchema({
					type: 'select',
					options: [
						{ label: 'Option A', value: 'a' },
						{ label: 'Option B', value: 'b' },
					],
				});

				const result = validateConfigField(schema, 'a');

				expect(result).toBeUndefined();
			});

			it('should return error for invalid option value', () => {
				const schema = makeSchema({
					type: 'select',
					options: [{ label: 'Option A', value: 'a' }],
				});

				const result = validateConfigField(schema, 'c');

				expect(result).toBe('Invalid selection for Test Field');
			});

			it('should return undefined when options are not defined', () => {
				const schema = makeSchema({ type: 'select' });

				const result = validateConfigField(schema, 'anything');

				expect(result).toBeUndefined();
			});
		});

		describe('folder-list type', () => {
			it('should return undefined for any value', () => {
				const schema = makeSchema({ type: 'folder-list' });

				const result = validateConfigField(schema, ['/path/to/folder']);

				expect(result).toBeUndefined();
			});
		});
	});

	describe('validateAllFields', () => {
		it('should return valid result when all fields pass', () => {
			const schemas = [
				makeSchema({ key: 'name', type: 'string', required: true }),
				makeSchema({ key: 'count', type: 'number' }),
			];
			const values = { name: 'test', count: 5 };

			const result = validateAllFields(schemas, values);

			expect(result.isValid).toBe(true);
			expect(Object.keys(result.errors)).toHaveLength(0);
		});

		it('should return invalid result with errors for failing fields', () => {
			const schemas = [
				makeSchema({ key: 'name', type: 'string', label: 'Name', required: true }),
				makeSchema({ key: 'count', type: 'number', label: 'Count' }),
			];
			const values = { name: '', count: 'not-a-number' };

			const result = validateAllFields(schemas, values);

			expect(result.isValid).toBe(false);
			expect(result.errors.name).toBe('Name is required');
			expect(result.errors.count).toBe('Count must be a number');
		});

		it('should handle empty schemas array', () => {
			const result = validateAllFields([], {});

			expect(result.isValid).toBe(true);
			expect(Object.keys(result.errors)).toHaveLength(0);
		});

		it('should validate missing keys as undefined', () => {
			const schemas = [
				makeSchema({ key: 'required_field', required: true, label: 'Required' }),
			];
			const values = {};

			const result = validateAllFields(schemas, values);

			expect(result.isValid).toBe(false);
			expect(result.errors.required_field).toBe('Required is required');
		});
	});
});
