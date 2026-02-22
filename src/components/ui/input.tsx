import React, { forwardRef } from 'react';
import { StyleSheet, TextInput } from 'react-native';
import { TextInput as PaperTextInput } from 'react-native-paper';
import { useAppTheme } from '@/lib/theme';

type PaperTextInputProps = React.ComponentProps<typeof PaperTextInput>;

type InputProps = Omit<PaperTextInputProps, 'theme'> & {
	mode?: 'flat' | 'outlined';
};

export const Input = forwardRef<TextInput, InputProps>(function Input(
	{ mode = 'outlined', style, contentStyle, ...rest },
	ref
) {
	const { colors } = useAppTheme();

	return (
		<PaperTextInput
			ref={ref}
			mode={mode}
			style={[styles.input, style]}
			contentStyle={[contentStyle, styles.inputContent]}
			placeholderTextColor={colors.onSurfaceVariant}
			underlineColor={colors.outline}
			activeUnderlineColor={colors.primary}
			outlineColor={colors.outline}
			activeOutlineColor={colors.primary}
			textColor={colors.onSurface}
			{...rest}
		/>
	);
});

const styles = StyleSheet.create({
	input: {
		width: '100%',
		height: 48,
	},
	inputContent: {
		height: 48,
	},
});

export type { InputProps };
