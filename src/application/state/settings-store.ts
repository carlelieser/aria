import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ThemePreference = 'system' | 'light' | 'dark';
export type TabId = 'index' | 'explore' | 'downloads' | 'settings';
export type DefaultTab = TabId;

export const DEFAULT_TAB_ORDER: TabId[] = ['index', 'explore', 'downloads', 'settings'];

interface SettingsState {
	themePreference: ThemePreference;
	defaultTab: DefaultTab;
	accentColor: string | null;
	tabOrder: TabId[];

	setThemePreference: (preference: ThemePreference) => void;
	setDefaultTab: (tab: DefaultTab) => void;
	setAccentColor: (color: string | null) => void;
	setTabOrder: (order: TabId[]) => void;
	resetTabOrder: () => void;
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
			accentColor: null,
			tabOrder: DEFAULT_TAB_ORDER,

			setThemePreference: (preference: ThemePreference) => {
				set({ themePreference: preference });
			},
			setDefaultTab: (tab: DefaultTab) => {
				set({ defaultTab: tab });
			},
			setAccentColor: (color: string | null) => {
				set({ accentColor: color });
			},
			setTabOrder: (order: TabId[]) => {
				set({ tabOrder: order });
			},
			resetTabOrder: () => {
				set({ tabOrder: DEFAULT_TAB_ORDER });
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

export const useAccentColor = () =>
	useSettingsStore((state) => state.accentColor);

export const useSetAccentColor = () =>
	useSettingsStore((state) => state.setAccentColor);

export const useTabOrder = () =>
	useSettingsStore((state) => state.tabOrder);

export const useSetTabOrder = () =>
	useSettingsStore((state) => state.setTabOrder);

export const useResetTabOrder = () =>
	useSettingsStore((state) => state.resetTabOrder);
