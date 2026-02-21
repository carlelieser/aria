import { TextStyle } from 'react-native';

export const FontFamily = {
	regular: 'GoogleSans-Regular',
	medium: 'GoogleSans-Medium',
	semiBold: 'GoogleSans-SemiBold',
	bold: 'GoogleSans-Bold',
	italic: 'GoogleSans-Italic',
} as const;

export const DisplayFontFamily = {
	regular: 'Oswald-Regular',
	medium: 'Oswald-Medium',
	semiBold: 'Oswald-SemiBold',
	bold: 'Oswald-Bold',
} as const;

type FontWeight = NonNullable<TextStyle['fontWeight']>;

const BODY_WEIGHT_MAP: Record<FontWeight, string> = {
	'100': FontFamily.regular,
	'200': FontFamily.regular,
	'300': FontFamily.regular,
	'400': FontFamily.regular,
	normal: FontFamily.regular,
	'500': FontFamily.medium,
	'600': FontFamily.semiBold,
	'700': FontFamily.bold,
	bold: FontFamily.bold,
	'800': FontFamily.bold,
	'900': FontFamily.bold,
	ultralight: FontFamily.regular,
	thin: FontFamily.regular,
	light: FontFamily.regular,
	regular: FontFamily.regular,
	medium: FontFamily.medium,
	semibold: FontFamily.semiBold,
	condensedBold: FontFamily.bold,
	condensed: FontFamily.regular,
	heavy: FontFamily.bold,
	black: FontFamily.bold,
};

const DISPLAY_WEIGHT_MAP: Record<FontWeight, string> = {
	'100': DisplayFontFamily.regular,
	'200': DisplayFontFamily.regular,
	'300': DisplayFontFamily.regular,
	'400': DisplayFontFamily.regular,
	normal: DisplayFontFamily.regular,
	'500': DisplayFontFamily.medium,
	'600': DisplayFontFamily.semiBold,
	'700': DisplayFontFamily.bold,
	bold: DisplayFontFamily.bold,
	'800': DisplayFontFamily.bold,
	'900': DisplayFontFamily.bold,
	ultralight: DisplayFontFamily.regular,
	thin: DisplayFontFamily.regular,
	light: DisplayFontFamily.regular,
	regular: DisplayFontFamily.regular,
	medium: DisplayFontFamily.medium,
	semibold: DisplayFontFamily.semiBold,
	condensedBold: DisplayFontFamily.bold,
	condensed: DisplayFontFamily.regular,
	heavy: DisplayFontFamily.bold,
	black: DisplayFontFamily.bold,
};

/** Resolve a fontWeight to the correct fontFamily for the body (Google Sans) font. */
export function resolveBodyFont(weight: FontWeight = '400'): string {
	return BODY_WEIGHT_MAP[weight] ?? FontFamily.regular;
}

/** Resolve a fontWeight to the correct fontFamily for the display (Oswald) font. */
export function resolveDisplayFont(weight: FontWeight = '400'): string {
	return DISPLAY_WEIGHT_MAP[weight] ?? DisplayFontFamily.regular;
}

export const M3Typography = {
	displayLarge: {
		fontFamily: DisplayFontFamily.regular,
		fontSize: 57,
		lineHeight: 64,
		fontWeight: '400' as TextStyle['fontWeight'],
		letterSpacing: -0.25,
	},
	displayMedium: {
		fontFamily: DisplayFontFamily.regular,
		fontSize: 45,
		lineHeight: 52,
		fontWeight: '400' as TextStyle['fontWeight'],
		letterSpacing: 0,
	},
	displaySmall: {
		fontFamily: DisplayFontFamily.regular,
		fontSize: 36,
		lineHeight: 44,
		fontWeight: '400' as TextStyle['fontWeight'],
		letterSpacing: 0,
	},

	headlineLarge: {
		fontFamily: DisplayFontFamily.regular,
		fontSize: 32,
		lineHeight: 40,
		fontWeight: '400' as TextStyle['fontWeight'],
		letterSpacing: 0,
	},
	headlineMedium: {
		fontFamily: DisplayFontFamily.medium,
		fontSize: 28,
		lineHeight: 36,
		fontWeight: '500' as TextStyle['fontWeight'],
		letterSpacing: 0,
	},
	headlineSmall: {
		fontFamily: DisplayFontFamily.regular,
		fontSize: 24,
		lineHeight: 32,
		fontWeight: '400' as TextStyle['fontWeight'],
		letterSpacing: 0,
	},

	titleLarge: {
		fontFamily: FontFamily.regular,
		fontSize: 22,
		lineHeight: 26,
		fontWeight: '400' as TextStyle['fontWeight'],
		letterSpacing: 0,
	},
	titleMedium: {
		fontFamily: FontFamily.medium,
		fontSize: 16,
		lineHeight: 20,
		fontWeight: '500' as TextStyle['fontWeight'],
		letterSpacing: 0.15,
	},
	titleSmall: {
		fontFamily: FontFamily.medium,
		fontSize: 14,
		lineHeight: 18,
		fontWeight: '500' as TextStyle['fontWeight'],
		letterSpacing: 0.1,
	},

	bodyLarge: {
		fontFamily: FontFamily.regular,
		fontSize: 16,
		lineHeight: 20,
		fontWeight: '400' as TextStyle['fontWeight'],
		letterSpacing: 0.5,
	},
	bodyMedium: {
		fontFamily: FontFamily.regular,
		fontSize: 14,
		lineHeight: 18,
		fontWeight: '400' as TextStyle['fontWeight'],
		letterSpacing: 0.25,
	},
	bodySmall: {
		fontFamily: FontFamily.regular,
		fontSize: 12,
		lineHeight: 16,
		fontWeight: '400' as TextStyle['fontWeight'],
		letterSpacing: 0.4,
	},

	labelLarge: {
		fontFamily: FontFamily.medium,
		fontSize: 14,
		lineHeight: 18,
		fontWeight: '500' as TextStyle['fontWeight'],
		letterSpacing: 0.1,
	},
	labelMedium: {
		fontFamily: FontFamily.medium,
		fontSize: 12,
		lineHeight: 16,
		fontWeight: '500' as TextStyle['fontWeight'],
		letterSpacing: 0.5,
	},
	labelSmall: {
		fontFamily: FontFamily.medium,
		fontSize: 11,
		lineHeight: 14,
		fontWeight: '500' as TextStyle['fontWeight'],
		letterSpacing: 0.5,
	},
} as const;

export type M3TypographyVariant = keyof typeof M3Typography;
