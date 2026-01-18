/**
 * useDetailsPageTheme Hook
 *
 * Creates a scoped Material 3 theme from artwork colors for detail pages.
 * Generates a full M3 color palette from the dominant artwork color.
 */

import { useMemo } from 'react';
import { createMaterial3Theme, Material3Theme } from '@pchmn/expo-material3-theme';
import { useArtworkColors } from './use-artwork-colors';
import { useAppTheme } from '@/lib/theme';
import type { M3ColorScheme } from '@/lib/theme/colors';

export interface DetailsPageTheme {
	/** Scoped M3 colors derived from artwork */
	readonly colors: M3ColorScheme;
	/** Whether the theme is still loading */
	readonly isLoading: boolean;
	/** Whether custom colors are active (vs fallback to app theme) */
	readonly hasCustomColors: boolean;
	/** The source color used for theme generation */
	readonly sourceColor: string | null;
}

/**
 * Generate a scoped theme from a source color
 */
function generateScopedTheme(
	sourceColor: string,
	isDark: boolean,
	fallbackColors: M3ColorScheme
): M3ColorScheme {
	try {
		const theme: Material3Theme = createMaterial3Theme(sourceColor);
		const schemeColors = isDark ? theme.dark : theme.light;

		return {
			...schemeColors,
			elevation: fallbackColors.elevation,
		} as M3ColorScheme;
	} catch {
		return fallbackColors;
	}
}

/**
 * Hook to create a scoped theme for detail pages based on artwork
 *
 * @param artworkUrl - URL of the artwork image to extract colors from
 * @returns DetailsPageTheme with scoped colors and loading state
 */
export function useDetailsPageTheme(artworkUrl: string | undefined): DetailsPageTheme {
	const { colors: appColors, isDark } = useAppTheme();
	const artworkColors = useArtworkColors(artworkUrl);

	const theme = useMemo<DetailsPageTheme>(() => {
		if (artworkColors.isLoading) {
			return {
				colors: appColors,
				isLoading: true,
				hasCustomColors: false,
				sourceColor: null,
			};
		}

		if (!artworkColors.dominant) {
			return {
				colors: appColors,
				isLoading: false,
				hasCustomColors: false,
				sourceColor: null,
			};
		}

		const scopedColors = generateScopedTheme(artworkColors.dominant, isDark, appColors);

		return {
			colors: scopedColors,
			isLoading: false,
			hasCustomColors: true,
			sourceColor: artworkColors.dominant,
		};
	}, [artworkColors.dominant, artworkColors.isLoading, appColors, isDark]);

	return theme;
}
