/**
 * Toast Component Types
 *
 * Shared constants and color utilities for toast variants.
 */

import type { useAppTheme } from '@/lib/theme';
import type { ToastVariant } from '@/src/application/state/toast-store';

export const SWIPE_THRESHOLD = 50;
export const DISMISS_VELOCITY = 500;

/**
 * Get snackbar colors based on variant
 */
export function getVariantColors(
	variant: ToastVariant,
	colors: ReturnType<typeof useAppTheme>['colors']
): { readonly backgroundColor: string; readonly textColor: string } {
	switch (variant) {
		case 'error':
			return {
				backgroundColor: colors.errorContainer,
				textColor: colors.onErrorContainer,
			};
		case 'success':
			return {
				backgroundColor: colors.primaryContainer,
				textColor: colors.onPrimaryContainer,
			};
		case 'warning':
			return {
				backgroundColor: colors.tertiaryContainer,
				textColor: colors.onTertiaryContainer,
			};
		case 'info':
			return {
				backgroundColor: colors.secondaryContainer,
				textColor: colors.onSecondaryContainer,
			};
		default:
			return {
				backgroundColor: colors.inverseSurface,
				textColor: colors.inverseOnSurface,
			};
	}
}
