import { useColorScheme as useSystemColorScheme } from 'react-native';
import { useSettingsStore } from '@/src/application/state/settings-store';

/**
 * Hook that returns the active color scheme based on user preference.
 * Returns 'light' or 'dark' based on:
 * 1. User's explicit preference (if set to 'light' or 'dark')
 * 2. System preference (if user preference is 'system')
 */
export function useColorScheme(): 'light' | 'dark' {
	const systemColorScheme = useSystemColorScheme();
	const themePreference = useSettingsStore((state) => state.themePreference);

	if (themePreference === 'system') {
		return systemColorScheme === 'dark' ? 'dark' : 'light';
	}

	return themePreference;
}
