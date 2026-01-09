import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ThemePreference = 'system' | 'light' | 'dark';
export type DefaultTab = 'index' | 'explore' | 'downloads' | 'settings';

interface SettingsState {
	themePreference: ThemePreference;
	defaultTab: DefaultTab;

	setThemePreference: (preference: ThemePreference) => void;
	setDefaultTab: (tab: DefaultTab) => void;
}

const customStorage = {
	getItem: async (name: string): Promise<string | null> => {
		return AsyncStorage.getItem(name);
	},
	setItem: async (name: string, value: string): Promise<void> => {
		await AsyncStorage.setItem(name, value);
	},
	removeItem: async (name: string): Promise<void> => {
		await AsyncStorage.removeItem(name);
	},
};

export const useSettingsStore = create<SettingsState>()(
	persist(
		(set) => ({
			themePreference: 'system',
			defaultTab: 'index',

			setThemePreference: (preference: ThemePreference) => {
				set({ themePreference: preference });
			},
			setDefaultTab: (tab: DefaultTab) => {
				set({ defaultTab: tab });
			},
		}),
		{
			name: 'aria-settings-storage',
			storage: createJSONStorage(() => customStorage),
		}
	)
);

export const useThemePreference = () =>
	useSettingsStore((state) => state.themePreference);

export const useSetThemePreference = () =>
	useSettingsStore((state) => state.setThemePreference);

export const useDefaultTab = () =>
	useSettingsStore((state) => state.defaultTab);

export const useSetDefaultTab = () =>
	useSettingsStore((state) => state.setDefaultTab);
