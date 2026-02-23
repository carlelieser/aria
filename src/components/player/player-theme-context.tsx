/**
 * PlayerThemeContext
 *
 * Provides artwork-derived or app-theme colors to all player children.
 * Mirrors the DetailsPageContext pattern from details-page.tsx.
 */

import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useAppTheme } from '@/lib/theme';
import { useDetailsPageTheme } from '@/src/hooks/use-details-page-theme';
import { usePlayerBackground } from '@/src/application/state/settings-store';
import type { PlayerBackground } from '@/src/application/state/settings-store';
import type { M3ColorScheme } from '@/lib/theme/colors';

interface PlayerThemeContextValue {
	readonly colors: M3ColorScheme;
	readonly hasCustomColors: boolean;
	readonly backgroundStyle: PlayerBackground;
	/** Dominant color from artwork for solid background mode */
	readonly dominantColor: string | null;
}

const PlayerThemeContext = createContext<PlayerThemeContextValue | null>(null);

interface PlayerThemeProviderProps {
	readonly artworkUrl: string | undefined;
	readonly children: ReactNode;
}

export function PlayerThemeProvider({ artworkUrl, children }: PlayerThemeProviderProps) {
	const backgroundStyle = usePlayerBackground();
	const { colors: appColors } = useAppTheme();
	const { headerColors, hasCustomColors, sourceColor } = useDetailsPageTheme(artworkUrl);

	const value = useMemo<PlayerThemeContextValue>(() => {
		if (backgroundStyle === 'theme-color') {
			return {
				colors: appColors,
				hasCustomColors: false,
				backgroundStyle,
				dominantColor: null,
			};
		}

		// artwork-blur and artwork-solid both use artwork-derived colors
		return {
			colors: hasCustomColors ? headerColors : appColors,
			hasCustomColors,
			backgroundStyle,
			dominantColor: sourceColor,
		};
	}, [backgroundStyle, appColors, headerColors, hasCustomColors, sourceColor]);

	return <PlayerThemeContext.Provider value={value}>{children}</PlayerThemeContext.Provider>;
}

/**
 * Hook to access player-scoped theme colors.
 * Falls back to app theme colors if used outside PlayerThemeProvider.
 */
export function usePlayerTheme(): PlayerThemeContextValue {
	const context = useContext(PlayerThemeContext);
	const { colors } = useAppTheme();
	const backgroundStyle = usePlayerBackground();

	if (context) return context;

	return {
		colors,
		hasCustomColors: false,
		backgroundStyle,
		dominantColor: null,
	};
}
