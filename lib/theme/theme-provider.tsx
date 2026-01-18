import React, { createContext, useContext, useMemo } from 'react';
import { PaperProvider } from 'react-native-paper';
import { ThemeProvider as NavigationThemeProvider } from '@react-navigation/native';
import { useDynamicTheme, AppTheme } from './dynamic-theme';
import { M3Colors } from './colors';

interface ThemeContextValue {
	isDark: boolean;
	isDynamic: boolean;
	colors: typeof M3Colors.light;
	theme: AppTheme;
	updateTheme: (sourceColor: string) => void;
	resetTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function useAppTheme(): ThemeContextValue {
	const context = useContext(ThemeContext);
	if (!context) {
		throw new Error('useAppTheme must be used within AppThemeProvider');
	}
	return context;
}

interface AppThemeProviderProps {
	children: React.ReactNode;
}

export function AppThemeProvider({ children }: AppThemeProviderProps) {
	const { paperTheme, navigationTheme, isDynamic, isDark, colors, updateTheme, resetTheme } =
		useDynamicTheme();

	const contextValue = useMemo<ThemeContextValue>(
		() => ({
			isDark,
			isDynamic,
			colors: colors as typeof M3Colors.light,
			theme: paperTheme,
			updateTheme,
			resetTheme,
		}),
		[isDark, isDynamic, colors, paperTheme, updateTheme, resetTheme]
	);

	return (
		<ThemeContext.Provider value={contextValue}>
			<PaperProvider theme={paperTheme}>
				<NavigationThemeProvider value={navigationTheme}>
					{children}
				</NavigationThemeProvider>
			</PaperProvider>
		</ThemeContext.Provider>
	);
}
