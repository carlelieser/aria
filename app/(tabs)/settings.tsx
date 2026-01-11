/**
 * SettingsScreen
 *
 * App settings and preferences.
 * Uses M3 theming.
 */

import { ScrollView, StyleSheet, Linking } from 'react-native';
import { useCallback, useState } from 'react';
import { router } from 'expo-router';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { VersionDialog } from '@/components/ui/version-dialog';
import { PageLayout } from '@/components/page-layout';
import { SettingsItem } from '@/components/settings/settings-item';
import { SettingsSection } from '@/components/settings/settings-section';
import { SettingsSelect } from '@/components/settings/settings-select';
import { AccentColorPicker } from '@/components/settings/accent-color-picker';
import { TabOrderSetting } from '@/components/settings/tab-order-setting';
import { EqualizerSheet } from '@/components/equalizer-sheet';
import {
	TrashIcon,
	InfoIcon,
	PuzzleIcon,
	HardDriveIcon,
	SettingsIcon,
	SunMoonIcon,
	LayoutGridIcon,
	SlidersHorizontalIcon,
	MonitorSmartphoneIcon,
	SunIcon,
	MoonIcon,
	MusicIcon,
	CompassIcon,
	DownloadIcon,
	RotateCcwIcon,
	CodeIcon,
	GithubIcon,
	type LucideIcon,
} from 'lucide-react-native';
import { useLibraryStore } from '@/src/application/state/library-store';
import { useDownloadStore } from '@/src/application/state/download-store';
import { useEqualizerStore } from '@/src/application/state/equalizer-store';
import { useHistoryStore } from '@/src/application/state/history-store';
import { useSearchStore } from '@/src/application/state/search-store';
import { useExploreFilterStore } from '@/src/application/state/explore-filter-store';
import {
	useSettingsStore,
	type ThemePreference,
	type DefaultTab,
} from '@/src/application/state/settings-store';
import { useDownloadQueue, formatFileSize } from '@/hooks/use-download-queue';
import { useEqualizer } from '@/hooks/use-equalizer';
import { clearAllDownloads } from '@/src/infrastructure/filesystem/download-manager';
import { useToast } from '@/hooks/use-toast';
import Constants from 'expo-constants';

const THEME_OPTIONS: { value: ThemePreference; label: string; icon: LucideIcon }[] = [
	{ value: 'system', label: 'System', icon: MonitorSmartphoneIcon },
	{ value: 'light', label: 'Light', icon: SunIcon },
	{ value: 'dark', label: 'Dark', icon: MoonIcon },
];

const DEFAULT_TAB_OPTIONS: { value: DefaultTab; label: string; icon: LucideIcon }[] = [
	{ value: 'index', label: 'Library', icon: MusicIcon },
	{ value: 'explore', label: 'Explore', icon: CompassIcon },
	{ value: 'downloads', label: 'Downloads', icon: DownloadIcon },
	{ value: 'settings', label: 'Settings', icon: SettingsIcon },
];

export default function SettingsScreen() {
	const { tracks, playlists, favorites } = useLibraryStore();
	const {
		themePreference,
		setThemePreference,
		defaultTab,
		setDefaultTab,
		accentColor,
		setAccentColor,
	} = useSettingsStore();
	const { stats } = useDownloadQueue();
	const { isEnabled: eqEnabled, currentPreset } = useEqualizer();
	const { success, error } = useToast();
	const [equalizerSheetOpen, setEqualizerSheetOpen] = useState(false);
	const [clearLibraryDialogVisible, setClearLibraryDialogVisible] = useState(false);
	const [clearDownloadsDialogVisible, setClearDownloadsDialogVisible] = useState(false);
	const [versionDialogVisible, setVersionDialogVisible] = useState(false);
	const [resetSettingsDialogVisible, setResetSettingsDialogVisible] = useState(false);
	const [resetEqualizerDialogVisible, setResetEqualizerDialogVisible] = useState(false);
	const [factoryResetDialogVisible, setFactoryResetDialogVisible] = useState(false);

	const openEqualizerSheet = useCallback(() => {
		setEqualizerSheetOpen(true);
	}, []);

	const closeEqualizerSheet = useCallback(() => {
		setEqualizerSheetOpen(false);
	}, []);

	const handleClearLibrary = () => {
		setClearLibraryDialogVisible(true);
	};

	const confirmClearLibrary = () => {
		useLibraryStore.setState({
			tracks: [],
			playlists: [],
			favorites: new Set(),
		});
		setClearLibraryDialogVisible(false);
		success('Library cleared', 'All tracks, playlists, and favorites have been removed');
	};

	const handleClearDownloads = () => {
		setClearDownloadsDialogVisible(true);
	};

	const confirmClearDownloads = async () => {
		const result = await clearAllDownloads();
		if (result.success) {
			useDownloadStore.setState({
				downloads: new Map(),
				downloadedTracks: new Map(),
			});
			setClearDownloadsDialogVisible(false);
			success('Downloads cleared', 'All downloaded files have been removed');
		} else {
			setClearDownloadsDialogVisible(false);
			error('Failed to clear downloads', result.error.message);
		}
	};

	const handleResetSettings = () => {
		setResetSettingsDialogVisible(true);
	};

	const confirmResetSettings = () => {
		useSettingsStore.getState().resetAllSettings();
		setResetSettingsDialogVisible(false);
		success('Settings reset', 'All settings have been restored to defaults');
	};

	const handleResetEqualizer = () => {
		setResetEqualizerDialogVisible(true);
	};

	const confirmResetEqualizer = () => {
		useEqualizerStore.getState().resetEqualizer();
		setResetEqualizerDialogVisible(false);
		success('Equalizer reset', 'Equalizer has been disabled and reset to flat');
	};

	const handleFactoryReset = () => {
		setFactoryResetDialogVisible(true);
	};

	const confirmFactoryReset = async () => {
		await clearAllDownloads();
		useDownloadStore.setState({
			downloads: new Map(),
			downloadedTracks: new Map(),
		});

		useLibraryStore.setState({
			tracks: [],
			playlists: [],
			favorites: new Set(),
		});

		useHistoryStore.getState().clearHistory();

		useSearchStore.getState().clearResults();
		useSearchStore.getState().clearRecentSearches();

		useExploreFilterStore.getState().clearAll();

		useEqualizerStore.getState().resetEqualizer();

		useSettingsStore.getState().resetAllSettings();

		setFactoryResetDialogVisible(false);
		success('Factory reset complete', 'All data has been cleared and settings reset');
	};

	const appVersion = Constants.expoConfig?.version ?? '1.0.0';

	return (
		<PageLayout header={{ icon: SettingsIcon, title: 'Settings' }}>
			<ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
				<SettingsSection title="Plugins">
					<SettingsItem
						icon={PuzzleIcon}
						title="Manage Plugins"
						subtitle="Music sources, playback, and more"
						onPress={() => router.push('/plugins')}
						showChevron
					/>
				</SettingsSection>

				<SettingsSection title="Appearance">
					<SettingsSelect
						icon={SunMoonIcon}
						title="Theme"
						options={THEME_OPTIONS}
						value={themePreference}
						onValueChange={setThemePreference}
						portalName="theme-select"
					/>
					<AccentColorPicker value={accentColor} onValueChange={setAccentColor} />
					<SettingsSelect
						icon={LayoutGridIcon}
						title="Default Home Screen"
						options={DEFAULT_TAB_OPTIONS}
						value={defaultTab}
						onValueChange={setDefaultTab}
						portalName="default-tab-select"
					/>
					<TabOrderSetting />
				</SettingsSection>

				<SettingsSection title="Playback">
					<SettingsItem
						icon={SlidersHorizontalIcon}
						title="Equalizer"
						subtitle={eqEnabled ? `${currentPreset.name} (On)` : 'Off'}
						onPress={openEqualizerSheet}
						showChevron
					/>
				</SettingsSection>

				<SettingsSection title="Storage">
					<SettingsItem
						icon={HardDriveIcon}
						title="Storage Used"
						subtitle={`${formatFileSize(stats.totalSize)} · ${stats.completedCount} files`}
					/>
					{stats.completedCount > 0 && (
						<SettingsItem
							icon={TrashIcon}
							title="Clear All Downloads"
							subtitle="Remove all downloaded files"
							onPress={handleClearDownloads}
							destructive
						/>
					)}
				</SettingsSection>

				<SettingsSection title="Library">
					<SettingsItem
						icon={InfoIcon}
						title="Library Stats"
						subtitle={`${tracks.length} tracks · ${playlists.length} playlists · ${favorites.size} favorites`}
					/>
					<SettingsItem
						icon={TrashIcon}
						title="Clear Library"
						subtitle="Remove all tracks and playlists"
						onPress={handleClearLibrary}
						destructive
					/>
				</SettingsSection>

				<SettingsSection title="Reset">
					<SettingsItem
						icon={RotateCcwIcon}
						title="Reset Settings"
						subtitle="Reset appearance and navigation preferences"
						onPress={handleResetSettings}
						destructive
					/>
					<SettingsItem
						icon={RotateCcwIcon}
						title="Reset Equalizer"
						subtitle="Reset equalizer to default"
						onPress={handleResetEqualizer}
						destructive
					/>
					<SettingsItem
						icon={RotateCcwIcon}
						title="Factory Reset"
						subtitle="Clear all data and reset to defaults"
						onPress={handleFactoryReset}
						destructive
					/>
				</SettingsSection>

				<SettingsSection title="About">
					<SettingsItem
						icon={InfoIcon}
						title="Version"
						subtitle={appVersion}
						onPress={() => setVersionDialogVisible(true)}
						showChevron
					/>
					<SettingsItem
						icon={CodeIcon}
						title="Created by Carlos Santos"
						subtitle="Built with Expo and React Native"
						onPress={() => Linking.openURL('https://carlelieser.dev')}
						showChevron
					/>
					<SettingsItem
						icon={GithubIcon}
						title="Open Source"
						subtitle="View source code on GitHub"
						onPress={() => Linking.openURL('https://github.com/carlelieser/aria')}
						showChevron
					/>
				</SettingsSection>
			</ScrollView>

			<EqualizerSheet isOpen={equalizerSheetOpen} onClose={closeEqualizerSheet} />

			<ConfirmationDialog
				visible={clearLibraryDialogVisible}
				title="Clear Library"
				message="This will remove all tracks, playlists, and favorites. This action cannot be undone."
				confirmLabel="Clear"
				cancelLabel="Cancel"
				destructive
				onConfirm={confirmClearLibrary}
				onCancel={() => setClearLibraryDialogVisible(false)}
			/>

			<ConfirmationDialog
				visible={clearDownloadsDialogVisible}
				title="Clear All Downloads"
				message="This will remove all downloaded files. This action cannot be undone."
				confirmLabel="Clear All"
				cancelLabel="Cancel"
				destructive
				onConfirm={confirmClearDownloads}
				onCancel={() => setClearDownloadsDialogVisible(false)}
			/>

			<ConfirmationDialog
				visible={resetSettingsDialogVisible}
				title="Reset Settings"
				message="This will reset all appearance and navigation preferences to their defaults."
				confirmLabel="Reset"
				cancelLabel="Cancel"
				destructive
				onConfirm={confirmResetSettings}
				onCancel={() => setResetSettingsDialogVisible(false)}
			/>

			<ConfirmationDialog
				visible={resetEqualizerDialogVisible}
				title="Reset Equalizer"
				message="This will disable the equalizer and reset all bands to flat."
				confirmLabel="Reset"
				cancelLabel="Cancel"
				destructive
				onConfirm={confirmResetEqualizer}
				onCancel={() => setResetEqualizerDialogVisible(false)}
			/>

			<ConfirmationDialog
				visible={factoryResetDialogVisible}
				title="Factory Reset"
				message="This will clear all your data including library, downloads, settings, and equalizer. This action cannot be undone."
				confirmLabel="Reset Everything"
				cancelLabel="Cancel"
				destructive
				onConfirm={confirmFactoryReset}
				onCancel={() => setFactoryResetDialogVisible(false)}
			/>

			<VersionDialog
				visible={versionDialogVisible}
				onDismiss={() => setVersionDialogVisible(false)}
			/>
		</PageLayout>
	);
}

const styles = StyleSheet.create({
	scrollView: {
		flex: 1,
		paddingHorizontal: 8,
	},
	scrollContent: {
		paddingBottom: 32,
	},
});
