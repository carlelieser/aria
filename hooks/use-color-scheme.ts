import { useColorScheme as useSystemColorScheme } from 'react-native';
import { useSettingsStore } from '@/src/application/state/settings-store';

export function useColorScheme(): 'light' | 'dark' {
	const systemColorScheme = useSystemColorScheme();
	const themePreference = useSettingsStore((state) => state.themePreference);

	if (themePreference === 'system') {
		return systemColorScheme === 'dark' ? 'dark' : 'light';
	}

	return themePreference;
}
