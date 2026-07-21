/**
 * DetailsPage Context
 *
 * Provides scoped theme colors for detail page components.
 * Falls back to app theme colors when used outside DetailsPage.
 */

import { createContext, useContext } from 'react';
import { useAppTheme } from '@/lib/theme';
import type { M3ColorScheme } from '@/lib/theme/colors';

export interface DetailsPageContextValue {
	readonly colors: M3ColorScheme;
	readonly headerColors: M3ColorScheme;
	readonly headerSolid: boolean;
	readonly hasCustomColors: boolean;
}

export const DetailsPageContext = createContext<DetailsPageContextValue | null>(null);

/**
 * Hook to access the scoped detail page theme colors.
 * Falls back to app theme colors if used outside DetailsPage.
 */
export function useDetailsPageColors(): M3ColorScheme {
	const context = useContext(DetailsPageContext);
	const { colors } = useAppTheme();
	return context?.colors ?? colors;
}

/**
 * Hook to access the colors for elements overlaying the header (nav bar
 * icons, action buttons). The header blur follows the app theme, so these
 * track the scoped scheme's on-surface colors in both scroll states.
 */
export function useDetailsPageHeaderColors(): M3ColorScheme {
	const context = useContext(DetailsPageContext);
	const { colors } = useAppTheme();
	return context?.colors ?? colors;
}
