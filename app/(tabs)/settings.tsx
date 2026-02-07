import { StyleSheet, Linking } from 'react-native';
import { useCallback, useMemo, useState } from 'react';
import { router } from 'expo-router';
import { ConfirmationDialog } from '@/src/components/ui/confirmation-dialog';
import { VersionDialog } from '@/src/components/ui/version-dialog';
import { PlayerAwareScrollView } from '@/src/components/ui/player-aware-scroll-view';
import { PageLayout } from '@/src/components/ui/page-layout';
import { SettingsItem } from '@/src/components/settings/settings-item';
import { SettingsSection } from '@/src/components/settings/settings-section';
import { SettingsSelect } from '@/src/components/settings/settings-select';
import { AccentColorPicker } from '@/src/components/settings/accent-color-picker';
import { TabOrderSetting } from '@/src/components/settings/tab-order-setting';
import { EqualizerSheet } from '@/src/components/settings/equalizer-sheet';
import { Switch } from 'react-native-paper';
import {
	TrashIcon,
	InfoIcon,
	PlugIcon,
	HardDriveIcon,
	SunMoonIcon,
	LayoutGridIcon,
	SlidersHorizontalIcon,
	MusicIcon,
	WifiOffIcon,
	RotateCcwIcon,
	CodeIcon,
	GithubIcon,
	CameraIcon,
} from 'lucide-react-native';
import { THEME_OPTIONS, DEFAULT_TAB_OPTIONS } from '@/lib/settings-config';
import { useLibraryStore } from '@application/state/library-store';
import { useLibraryFilterStore } from '@application/state/library-filter-store';
import { useEqualizerStore } from '@application/state/equalizer-store';
import { useSettingsStore } from '@application/state/settings-store';
import { useDownloadQueue, formatFileSize } from '@/src/hooks/use-download-queue';
import { useEqualizer } from '@/src/hooks/use-equalizer';
import { useClearDownloads } from '@/src/hooks/use-clear-downloads';
import { useFactoryReset } from '@/src/hooks/use-factory-reset';
import { useToast } from '@/src/hooks/use-toast';
import { loadMockData, clearMockData, isMockDataLoaded } from '@/src/dev/load-mock-data';
import Constants from 'expo-constants';

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
	const { clearDownloads } = useClearDownloads();
	const { factoryReset } = useFactoryReset();
	const offlineMode = useLibraryFilterStore((s) => s.activeFilters.downloadedOnly);
	const toggleOfflineMode = useLibraryFilterStore((s) => s.toggleDownloadedOnly);

	const offlineModeSwitch = useMemo(
		() => <Switch value={offlineMode} onValueChange={toggleOfflineMode} />,
		[offlineMode, toggleOfflineMode]
	);
	const { success } = useToast();
	const [equalizerSheetOpen, setEqualizerSheetOpen] = useState(false);
	const [clearLibraryDialogVisible, setClearLibraryDialogVisible] = useState(false);
	const [clearDownloadsDialogVisible, setClearDownloadsDialogVisible] = useState(false);
	const [versionDialogVisible, setVersionDialogVisible] = useState(false);
	const [resetSettingsDialogVisible, setResetSettingsDialogVisible] = useState(false);
	const [resetEqualizerDialogVisible, setResetEqualizerDialogVisible] = useState(false);
	const [factoryResetDialogVisible, setFactoryResetDialogVisible] = useState(false);
	const [mockDataLoaded, setMockDataLoaded] = useState(() => isMockDataLoaded());

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
		useLibraryStore.getState().clearLibrary();
		setClearLibraryDialogVisible(false);
		success('Library cleared', 'All tracks, playlists, and favorites have been removed');
	};

	const handleClearDownloads = () => {
		setClearDownloadsDialogVisible(true);
	};

	const confirmClearDownloads = async () => {
		await clearDownloads();
		setClearDownloadsDialogVisible(false);
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

	const handleToggleMockData = () => {
		if (mockDataLoaded) {
			clearMockData();
			setMockDataLoaded(false);
			success('Mock data cleared', 'Screenshot mode disabled');
		} else {
			loadMockData();
			setMockDataLoaded(true);
			success('Mock data loaded', 'Screenshot mode enabled');
		}
	};

	const confirmFactoryReset = async () => {
		await factoryReset();
		setFactoryResetDialogVisible(false);
	};

	const appVersion = Constants.expoConfig?.version ?? '1.0.0';

	return (
		<PageLayout
			header={{
				title: 'Settings',
				showBack: true,
			}}
		>
			<PlayerAwareScrollView
				style={styles.scrollView}
				contentContainerStyle={styles.scrollContent}
			>
				<SettingsSection title="Plugins">
					<SettingsItem
						icon={PlugIcon}
						title="Manage plugins"
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
						title="Default home screen"
						options={DEFAULT_TAB_OPTIONS}
						value={defaultTab}
						onValueChange={setDefaultTab}
						portalName="default-tab-select"
					/>
					<TabOrderSetting />
				</SettingsSection>

				<SettingsSection title="Playback">
					<SettingsItem
						icon={WifiOffIcon}
						title="Offline mode"
						subtitle="Show only downloaded songs"
						rightElement={offlineModeSwitch}
						onPress={toggleOfflineMode}
					/>
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
						title="Storage used"
						subtitle={`${formatFileSize(stats.totalSize)} · ${stats.completedCount} files`}
					/>
					{stats.completedCount > 0 && (
						<SettingsItem
							icon={TrashIcon}
							title="Clear all downloads"
							subtitle="Remove all downloaded files"
							onPress={handleClearDownloads}
							destructive
						/>
					)}
				</SettingsSection>

				<SettingsSection title="Library">
					<SettingsItem
						icon={MusicIcon}
						title="Library settings"
						subtitle="Default tab and display options"
						onPress={() => router.push('/library/settings')}
						showChevron
					/>
					<SettingsItem
						icon={InfoIcon}
						title="Library stats"
						subtitle={`${tracks.length} tracks · ${playlists.length} playlists · ${favorites.size} favorites`}
					/>
					<SettingsItem
						icon={TrashIcon}
						title="Clear library"
						subtitle="Remove all tracks and playlists"
						onPress={handleClearLibrary}
						destructive
					/>
				</SettingsSection>

				<SettingsSection title="Reset">
					<SettingsItem
						icon={RotateCcwIcon}
						title="Reset settings"
						subtitle="Reset appearance and navigation preferences"
						onPress={handleResetSettings}
						destructive
					/>
					<SettingsItem
						icon={RotateCcwIcon}
						title="Reset equalizer"
						subtitle="Reset equalizer to default"
						onPress={handleResetEqualizer}
						destructive
					/>
					<SettingsItem
						icon={RotateCcwIcon}
						title="Factory reset"
						subtitle="Clear all data and reset to defaults"
						onPress={handleFactoryReset}
						destructive
					/>
				</SettingsSection>

				<SettingsSection title="Developer">
					<SettingsItem
						icon={CameraIcon}
						title="Screenshot mode"
						subtitle={
							mockDataLoaded
								? 'Loaded (tap to clear)'
								: 'Load mock data for screenshots'
						}
						onPress={handleToggleMockData}
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
						title="Developer"
						subtitle="Carlos Santos"
						onPress={() => Linking.openURL('https://carlelieser.dev')}
						showChevron
					/>
					<SettingsItem
						icon={GithubIcon}
						title="Source code"
						subtitle="View on GitHub"
						onPress={() => Linking.openURL('https://github.com/carlelieser/aria')}
						showChevron
					/>
				</SettingsSection>
			</PlayerAwareScrollView>

			<EqualizerSheet isOpen={equalizerSheetOpen} onClose={closeEqualizerSheet} />

			<ConfirmationDialog
				visible={clearLibraryDialogVisible}
				title="Clear library"
				message="This will remove all tracks, playlists, and favorites. This action cannot be undone."
				confirmLabel="Clear"
				cancelLabel="Cancel"
				destructive
				onConfirm={confirmClearLibrary}
				onCancel={() => setClearLibraryDialogVisible(false)}
			/>

			<ConfirmationDialog
				visible={clearDownloadsDialogVisible}
				title="Clear all downloads"
				message="This will remove all downloaded files. This action cannot be undone."
				confirmLabel="Clear All"
				cancelLabel="Cancel"
				destructive
				onConfirm={confirmClearDownloads}
				onCancel={() => setClearDownloadsDialogVisible(false)}
			/>

			<ConfirmationDialog
				visible={resetSettingsDialogVisible}
				title="Reset settings"
				message="This will reset all appearance and navigation preferences to their defaults."
				confirmLabel="Reset"
				cancelLabel="Cancel"
				destructive
				onConfirm={confirmResetSettings}
				onCancel={() => setResetSettingsDialogVisible(false)}
			/>

			<ConfirmationDialog
				visible={resetEqualizerDialogVisible}
				title="Reset equalizer"
				message="This will disable the equalizer and reset all bands to flat."
				confirmLabel="Reset"
				cancelLabel="Cancel"
				destructive
				onConfirm={confirmResetEqualizer}
				onCancel={() => setResetEqualizerDialogVisible(false)}
			/>

			<ConfirmationDialog
				visible={factoryResetDialogVisible}
				title="Factory reset"
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
