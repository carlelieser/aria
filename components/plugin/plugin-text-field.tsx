/**
 * Plugin Text Field Component
 *
 * Text/number input field for plugin configuration.
 */

import { memo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { Input } from '@/components/ui/input';
import { useAppTheme } from '@/lib/theme';
import type { PluginConfigSchema } from '@/src/plugins/core/interfaces/base-plugin';

interface PluginTextFieldProps {
	schema: PluginConfigSchema;
	value: string;
	onChange: (key: string, value: string) => void;
	onBlur: (key: string) => void;
	error?: string;
}

export const PluginTextField = memo(function PluginTextField({
	schema,
	value,
	onChange,
	onBlur,
	error,
}: PluginTextFieldProps) {
	const { colors } = useAppTheme();

	const keyboardType = schema.type === 'number' ? 'decimal-pad' : 'default';
	const label = schema.required ? `${schema.label} *` : schema.label;

	return (
		<View style={styles.container}>
			<Input
				label={label}
				value={value ?? ''}
				onChangeText={(text) => onChange(schema.key, text)}
				onBlur={() => onBlur(schema.key)}
				keyboardType={keyboardType}
				error={!!error}
				autoCapitalize="none"
				autoCorrect={false}
			/>
			{schema.description && !error && (
				<Text
					variant="bodySmall"
					style={[styles.helper, { color: colors.onSurfaceVariant }]}
				>
					{schema.description}
				</Text>
			)}
			{error && (
				<Text variant="bodySmall" style={[styles.error, { color: colors.error }]}>
					{error}
				</Text>
			)}
		</View>
	);
});

const styles = StyleSheet.create({
	container: {
		paddingHorizontal: 16,
		paddingVertical: 8,
	},
	helper: {
		marginTop: 4,
		paddingHorizontal: 12,
	},
	error: {
		marginTop: 4,
		paddingHorizontal: 12,
	},
});
