import { useMemo } from 'react';
import { createMaterial3Theme, Material3Theme } from '@pchmn/expo-material3-theme';
import { useArtworkColors } from './use-artwork-colors';
import { useAppTheme } from '@/lib/theme';
import type { M3ColorScheme } from '@/lib/theme/colors';

export interface DetailsPageTheme {
	readonly colors: M3ColorScheme;
	/** Dark-variant colors for text overlaying the dark-tinted blur header */
	readonly headerColors: M3ColorScheme;
	readonly isLoading: boolean;
	readonly hasCustomColors: boolean;
	readonly sourceColor: string | null;
}

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

export function useDetailsPageTheme(artworkUrl: string | undefined): DetailsPageTheme {
	const { colors: appColors, isDark } = useAppTheme();
	const artworkColors = useArtworkColors(artworkUrl);

	const theme = useMemo<DetailsPageTheme>(() => {
		if (artworkColors.isLoading) {
			return {
				colors: appColors,
				headerColors: appColors,
				isLoading: true,
				hasCustomColors: false,
				sourceColor: null,
			};
		}

		if (!artworkColors.dominant) {
			return {
				colors: appColors,
				headerColors: appColors,
				isLoading: false,
				hasCustomColors: false,
				sourceColor: null,
			};
		}

		const scopedColors = generateScopedTheme(artworkColors.dominant, isDark, appColors);
		const darkColors = generateScopedTheme(artworkColors.dominant, true, appColors);

		return {
			colors: scopedColors,
			headerColors: darkColors,
			isLoading: false,
			hasCustomColors: true,
			sourceColor: artworkColors.dominant,
		};
	}, [artworkColors.dominant, artworkColors.isLoading, appColors, isDark]);

	return theme;
}
