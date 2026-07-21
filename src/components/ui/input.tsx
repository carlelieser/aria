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
			contentStyle={contentStyle}
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
	// Paper reads the label's lineHeight from the input's `style`; on Android it
	// otherwise defaults to the font's natural (tall) metrics, which clips the
	// floated outlined label's top. Pin it to the 16px body size.
	input: {
		width: '100%',
		lineHeight: 16,
	},
});

export type { InputProps };
