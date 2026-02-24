/**
 * Text Component
 *
 * M3-compliant text using React Native Paper.
 * Maps previous variant names to M3 typography scale.
 */

import type { TextStyle } from 'react-native';
import { Text as PaperText } from 'react-native-paper';
import { useAppTheme } from '@/lib/theme';
import { mapVariantToPaper, getVariantStyles } from './variant-mapping';
import type { TextProps } from './types';

export function Text({
	variant = 'default',
	children,
	style,
	numberOfLines,
	ellipsizeMode,
	align,
	accessibilityRole,
	selectable = false,
	onPress,
}: TextProps) {
	const { colors } = useAppTheme();

	const paperVariant = mapVariantToPaper(variant);
	const variantStyles = getVariantStyles(variant, colors);

	const combinedStyle: TextStyle = {
		...variantStyles,
		...(align ? { textAlign: align } : {}),
		...(style as object),
	};

	return (
		<PaperText
			variant={paperVariant}
			style={combinedStyle}
			numberOfLines={numberOfLines}
			ellipsizeMode={ellipsizeMode}
			accessibilityRole={accessibilityRole}
			selectable={selectable}
			onPress={onPress}
		>
			{children}
		</PaperText>
	);
}

export type { TextProps, TextVariant, M3Variant, LegacyVariant } from './types';
