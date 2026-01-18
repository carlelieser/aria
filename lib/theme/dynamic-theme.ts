import { useEffect, useRef } from 'react';
import { useMaterial3Theme } from '@pchmn/expo-material3-theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAccentColor } from '@/src/application/state/settings-store';
import { MD3DarkTheme, MD3LightTheme, adaptNavigationTheme } from 'react-native-paper';
import {
	DarkTheme as NavigationDarkTheme,
	DefaultTheme as NavigationDefaultTheme,
} from '@react-navigation/native';
import { M3Colors, M3ColorScheme, SEED_COLOR } from './colors';

export type AppTheme = typeof MD3LightTheme & {
	colors: typeof MD3LightTheme.colors & M3ColorScheme;
};

function createPaperTheme(colors: M3ColorScheme, isDark: boolean) {
	const baseTheme = isDark ? MD3DarkTheme : MD3LightTheme;

	return {
		...baseTheme,
		colors: {
			...baseTheme.colors,
			...colors,
			elevation: {
				level0: colors.elevation.level0,
				level1: colors.elevation.level1,
				level2: colors.elevation.level2,
				level3: colors.elevation.level3,
				level4: colors.elevation.level4,
				level5: colors.elevation.level5,
			},
		},
	} as AppTheme;
}

const { LightTheme: AdaptedLightTheme, DarkTheme: AdaptedDarkTheme } = adaptNavigationTheme({
	reactNavigationLight: NavigationDefaultTheme,
	reactNavigationDark: NavigationDarkTheme,
});

export function useDynamicTheme() {
	const colorScheme = useColorScheme();
	const isDark = colorScheme === 'dark';
	const accentColor = useAccentColor();

	const {
		theme: dynamicTheme,
		updateTheme,
		resetTheme,
	} = useMaterial3Theme({
		fallbackSourceColor: accentColor ?? SEED_COLOR,
	});

	const prevAccentColorRef = useRef<string | null | undefined>(undefined);

	useEffect(() => {
		if (prevAccentColorRef.current === accentColor) {
			return;
		}
		prevAccentColorRef.current = accentColor;

		if (accentColor) {
			updateTheme(accentColor);
		} else {
			resetTheme();
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [accentColor]);

	const colors = dynamicTheme
		? isDark
			? dynamicTheme.dark
			: dynamicTheme.light
		: isDark
			? M3Colors.dark
			: M3Colors.light;

	const paperTheme = createPaperTheme(colors as typeof M3Colors.light, isDark);

	const navigationTheme = isDark
		? {
				...AdaptedDarkTheme,
				colors: {
					...AdaptedDarkTheme.colors,
					primary: colors.primary,
					background: colors.background,
					card: colors.surfaceContainerHigh,
					text: colors.onSurface,
					border: colors.outlineVariant,
					notification: colors.error,
				},
			}
		: {
				...AdaptedLightTheme,
				colors: {
					...AdaptedLightTheme.colors,
					primary: colors.primary,
					background: colors.background,
					card: colors.surfaceContainerHigh,
					text: colors.onSurface,
					border: colors.outlineVariant,
					notification: colors.error,
				},
			};

	return {
		paperTheme,

		navigationTheme,

		isDynamic: !!dynamicTheme,

		isDark,

		colors,

		updateTheme,

		resetTheme,
	};
}

export function getStaticTheme(isDark: boolean) {
	const colors = isDark ? M3Colors.dark : M3Colors.light;
	return createPaperTheme(colors, isDark);
}
