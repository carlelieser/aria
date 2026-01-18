import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ThemePreference = 'system' | 'light' | 'dark';
export type TabId = 'index' | 'downloads' | 'settings';
export type DefaultTab = TabId;
export type LibraryTabId = 'songs' | 'playlists' | 'artists' | 'albums';

export const DEFAULT_TAB_ORDER: TabId[] = ['index', 'downloads', 'settings'];
export const DEFAULT_ENABLED_TABS: TabId[] = ['index', 'downloads', 'settings'];
export const REQUIRED_TABS: TabId[] = ['settings'];

/**
 * Migrates legacy tab IDs for existing users.
 * Removes 'explore' and 'search' tabs that no longer exist.
 */
function migrateTabId(tabId: string): TabId | null {
	if (tabId === 'explore' || tabId === 'search') return null;
	return tabId as TabId;
}

function migrateTabIds(tabIds: string[]): TabId[] {
	return tabIds.map(migrateTabId).filter((id): id is TabId => id !== null);
}

interface SettingsState {
	themePreference: ThemePreference;
	defaultTab: DefaultTab;
	defaultLibraryTab: LibraryTabId;
	accentColor: string | null;
	tabOrder: TabId[];
	enabledTabs: TabId[];

	setThemePreference: (preference: ThemePreference) => void;
	setDefaultTab: (tab: DefaultTab) => void;
	setDefaultLibraryTab: (tab: LibraryTabId) => void;
	setAccentColor: (color: string | null) => void;
	setTabOrder: (order: TabId[]) => void;
	resetTabOrder: () => void;
	setEnabledTabs: (tabs: TabId[]) => void;
	toggleTab: (tabId: TabId) => void;
	resetEnabledTabs: () => void;
	resetAllSettings: () => void;
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
		(set, get) => ({
			themePreference: 'system',
			defaultTab: 'index',
			defaultLibraryTab: 'songs',
			accentColor: null,
			tabOrder: DEFAULT_TAB_ORDER,
			enabledTabs: DEFAULT_ENABLED_TABS,

			setThemePreference: (preference: ThemePreference) => {
				set({ themePreference: preference });
			},
			setDefaultTab: (tab: DefaultTab) => {
				set({ defaultTab: tab });
			},
			setDefaultLibraryTab: (tab: LibraryTabId) => {
				set({ defaultLibraryTab: tab });
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
			setEnabledTabs: (tabs: TabId[]) => {
				const withRequired = Array.from(new Set([...tabs, ...REQUIRED_TABS]));
				set({ enabledTabs: withRequired });
			},
			toggleTab: (tabId: TabId) => {
				if (REQUIRED_TABS.includes(tabId)) return;
				const { enabledTabs, defaultTab } = get();
				const isEnabled = enabledTabs.includes(tabId);
				if (isEnabled) {
					const newEnabledTabs = enabledTabs.filter((id) => id !== tabId);
					const updates: Partial<SettingsState> = { enabledTabs: newEnabledTabs };
					if (defaultTab === tabId) {
						updates.defaultTab = newEnabledTabs[0];
					}
					set(updates);
				} else {
					set({ enabledTabs: [...enabledTabs, tabId] });
				}
			},
			resetEnabledTabs: () => {
				set({ enabledTabs: DEFAULT_ENABLED_TABS });
			},
			resetAllSettings: () => {
				set({
					themePreference: 'system',
					defaultTab: 'index',
					defaultLibraryTab: 'songs',
					accentColor: null,
					tabOrder: DEFAULT_TAB_ORDER,
					enabledTabs: DEFAULT_ENABLED_TABS,
				});
			},
		}),
		{
			name: 'aria-settings-storage',
			storage: createJSONStorage(() => customStorage),
			version: 2,
			migrate: (persistedState, version) => {
				const state = persistedState as Partial<SettingsState>;
				// Version 0/1 -> 2: Remove 'explore' and 'search' tabs (now a modal)
				if (version < 2) {
					const migratedDefaultTab = state.defaultTab
						? migrateTabId(state.defaultTab)
						: null;
					return {
						...state,
						defaultTab: migratedDefaultTab ?? 'index',
						tabOrder: state.tabOrder
							? migrateTabIds(state.tabOrder)
							: DEFAULT_TAB_ORDER,
						enabledTabs: state.enabledTabs
							? migrateTabIds(state.enabledTabs)
							: DEFAULT_ENABLED_TABS,
					};
				}
				return state as SettingsState;
			},
		}
	)
);

export const useThemePreference = () => useSettingsStore((state) => state.themePreference);

export const useSetThemePreference = () => useSettingsStore((state) => state.setThemePreference);

export const useDefaultTab = () => useSettingsStore((state) => state.defaultTab);

export const useSetDefaultTab = () => useSettingsStore((state) => state.setDefaultTab);

export const useAccentColor = () => useSettingsStore((state) => state.accentColor);

export const useSetAccentColor = () => useSettingsStore((state) => state.setAccentColor);

export const useTabOrder = () => useSettingsStore((state) => state.tabOrder);

export const useSetTabOrder = () => useSettingsStore((state) => state.setTabOrder);

export const useResetTabOrder = () => useSettingsStore((state) => state.resetTabOrder);

export const useEnabledTabs = () => useSettingsStore((state) => state.enabledTabs);

export const useSetEnabledTabs = () => useSettingsStore((state) => state.setEnabledTabs);

export const useToggleTab = () => useSettingsStore((state) => state.toggleTab);

export const useResetEnabledTabs = () => useSettingsStore((state) => state.resetEnabledTabs);

export const useResetAllSettings = () => useSettingsStore((state) => state.resetAllSettings);

export const useDefaultLibraryTab = () => useSettingsStore((state) => state.defaultLibraryTab);

export const useSetDefaultLibraryTab = () =>
	useSettingsStore((state) => state.setDefaultLibraryTab);
