import { TextStyle } from 'react-native';

export const FontFamily = {
	regular: 'GoogleSans-Regular',
	medium: 'GoogleSans-Medium',
	semiBold: 'GoogleSans-SemiBold',
	bold: 'GoogleSans-Bold',
	italic: 'GoogleSans-Italic',
} as const;

export const M3Typography = {
	displayLarge: {
		fontFamily: FontFamily.regular,
		fontSize: 57,
		lineHeight: 64,
		fontWeight: '400' as TextStyle['fontWeight'],
		letterSpacing: -0.25,
	},
	displayMedium: {
		fontFamily: FontFamily.regular,
		fontSize: 45,
		lineHeight: 52,
		fontWeight: '400' as TextStyle['fontWeight'],
		letterSpacing: 0,
	},
	displaySmall: {
		fontFamily: FontFamily.regular,
		fontSize: 36,
		lineHeight: 44,
		fontWeight: '400' as TextStyle['fontWeight'],
		letterSpacing: 0,
	},

	headlineLarge: {
		fontFamily: FontFamily.regular,
		fontSize: 32,
		lineHeight: 40,
		fontWeight: '400' as TextStyle['fontWeight'],
		letterSpacing: 0,
	},
	headlineMedium: {
		fontFamily: FontFamily.regular,
		fontSize: 28,
		lineHeight: 36,
		fontWeight: '400' as TextStyle['fontWeight'],
		letterSpacing: 0,
	},
	headlineSmall: {
		fontFamily: FontFamily.regular,
		fontSize: 24,
		lineHeight: 32,
		fontWeight: '400' as TextStyle['fontWeight'],
		letterSpacing: 0,
	},

	titleLarge: {
		fontFamily: FontFamily.regular,
		fontSize: 22,
		lineHeight: 28,
		fontWeight: '400' as TextStyle['fontWeight'],
		letterSpacing: 0,
	},
	titleMedium: {
		fontFamily: FontFamily.medium,
		fontSize: 16,
		lineHeight: 24,
		fontWeight: '500' as TextStyle['fontWeight'],
		letterSpacing: 0.15,
	},
	titleSmall: {
		fontFamily: FontFamily.medium,
		fontSize: 14,
		lineHeight: 20,
		fontWeight: '500' as TextStyle['fontWeight'],
		letterSpacing: 0.1,
	},

	bodyLarge: {
		fontFamily: FontFamily.regular,
		fontSize: 16,
		lineHeight: 24,
		fontWeight: '400' as TextStyle['fontWeight'],
		letterSpacing: 0.5,
	},
	bodyMedium: {
		fontFamily: FontFamily.regular,
		fontSize: 14,
		lineHeight: 20,
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
		lineHeight: 20,
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
		lineHeight: 16,
		fontWeight: '500' as TextStyle['fontWeight'],
		letterSpacing: 0.5,
	},
} as const;

export type M3TypographyVariant = keyof typeof M3Typography;
