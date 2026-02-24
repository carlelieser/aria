/**
 * Text Variant Mapping Utilities
 *
 * Maps legacy and M3 variant names to Paper typography variants and styles.
 */

import type { TextStyle } from 'react-native';
import type { useAppTheme } from '@/lib/theme';
import type { TextVariant, M3Variant } from './types';

/**
 * Map legacy variants to M3 Paper variants
 */
export function mapVariantToPaper(variant: TextVariant): M3Variant {
	switch (variant) {
		case 'h1':
			return 'displaySmall';
		case 'h2':
			return 'headlineLarge';
		case 'h3':
			return 'headlineMedium';
		case 'h4':
			return 'headlineSmall';
		case 'lead':
			return 'titleLarge';
		case 'large':
			return 'titleMedium';
		case 'p':
		case 'default':
		case 'blockquote':
			return 'bodyLarge';
		case 'small':
		case 'muted':
		case 'code':
			return 'bodySmall';
		// M3 variants pass through
		case 'displayLarge':
		case 'displayMedium':
		case 'displaySmall':
		case 'headlineLarge':
		case 'headlineMedium':
		case 'headlineSmall':
		case 'titleLarge':
		case 'titleMedium':
		case 'titleSmall':
		case 'bodyLarge':
		case 'bodyMedium':
		case 'bodySmall':
		case 'labelLarge':
		case 'labelMedium':
		case 'labelSmall':
			return variant;
		default:
			return 'bodyMedium';
	}
}

/**
 * Get additional styles for specific variants
 */
export function getVariantStyles(
	variant: TextVariant,
	colors: ReturnType<typeof useAppTheme>['colors']
): TextStyle {
	switch (variant) {
		case 'h1':
			return { textAlign: 'center', fontWeight: '800' };
		case 'h2':
			return {
				borderBottomWidth: 1,
				borderBottomColor: colors.outlineVariant,
				paddingBottom: 8,
				fontWeight: '600',
			};
		case 'h3':
		case 'h4':
			return { fontWeight: '600' };
		case 'muted':
			return { color: colors.onSurfaceVariant };
		case 'lead':
			return { color: colors.onSurfaceVariant };
		case 'blockquote':
			return {
				fontStyle: 'italic',
				borderLeftWidth: 2,
				borderLeftColor: colors.outlineVariant,
				paddingLeft: 12,
				marginTop: 16,
			};
		case 'code':
			return {
				fontFamily: 'monospace',
				backgroundColor: colors.surfaceVariant,
				paddingHorizontal: 4,
				paddingVertical: 2,
				borderRadius: 4,
				fontWeight: '600',
			};
		default:
			return {};
	}
}
