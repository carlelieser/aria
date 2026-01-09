import { View, ScrollView, Switch, Linking, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { Icon } from '@/components/ui/icon';
import {
	ChevronLeftIcon,
	ChevronRightIcon,
	MoonIcon,
	SunIcon,
	TrashIcon,
	InfoIcon,
	HeartIcon,
	PuzzleIcon,
	DownloadIcon,
	HardDriveIcon,
	FolderIcon,
	type LucideIcon,
} from 'lucide-react-native';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useLibraryStore } from '@/src/application/state/library-store';
import { useDownloadStore } from '@/src/application/state/download-store';
import { useDownloadQueue, formatFileSize } from '@/hooks/use-download-queue';
import { clearAllDownloads } from '@/src/infrastructure/filesystem/download-manager';
import { useToast } from '@/hooks/use-toast';
import Constants from 'expo-constants';

type ThemeOption = 'light' | 'dark' | 'system';

export default function SettingsScreen() {
	const colorScheme = useColorScheme();
	const { tracks, playlists, favorites } = useLibraryStore();
	const { stats } = useDownloadQueue();
	const { success, error } = useToast();

	const handleClearLibrary = () => {
		Alert.alert(
			'Clear Library',
			'This will remove all tracks, playlists, and favorites. This action cannot be undone.',
			[
				{ text: 'Cancel', style: 'cancel' },
				{
					text: 'Clear',
					style: 'destructive',
					onPress: () => {
						useLibraryStore.setState({
							tracks: [],
							playlists: [],
							favorites: new Set(),
						});
						success('Library cleared', 'All tracks, playlists, and favorites have been removed');
					},
				},
			]
		);
	};

	const handleClearDownloads = () => {
		Alert.alert(
			'Clear All Downloads',
			'This will remove all downloaded files. This action cannot be undone.',
			[
				{ text: 'Cancel', style: 'cancel' },
				{
					text: 'Clear All',
					style: 'destructive',
					onPress: async () => {
						const result = await clearAllDownloads();
						if (result.success) {
							useDownloadStore.setState({
								downloads: new Map(),
								downloadedTracks: new Map(),
							});
							success('Downloads cleared', 'All downloaded files have been removed');
						} else {
							error('Failed to clear downloads', result.error.message);
						}
					},
				},
			]
		);
	};

	const appVersion = Constants.expoConfig?.version ?? '1.0.0';

	return (
		<SafeAreaView className="bg-background flex-1">
			{}
			<View className="flex-row items-center gap-2 p-4 border-b border-border">
				<Button variant="ghost" size="icon" onPress={() => router.back()}>
					<Icon as={ChevronLeftIcon} />
				</Button>
				<Text className="text-xl font-semibold">Settings</Text>
			</View>

			<ScrollView className="flex-1" contentContainerClassName="pb-8">
				{}
				<SettingsSection title="Appearance">
					<SettingsItem
						icon={colorScheme === 'dark' ? MoonIcon : SunIcon}
						title="Theme"
						subtitle={`Currently using ${colorScheme} mode`}
					/>
					<Text variant="muted" className="px-4 mt-2">
						Theme follows your system settings. Change your device's appearance settings
						to switch themes.
					</Text>
				</SettingsSection>

				{/* Plugins Section */}
				<SettingsSection title="Plugins">
					<SettingsItem
						icon={PuzzleIcon}
						title="Manage Plugins"
						subtitle="Music sources, playback, and more"
						onPress={() => router.navigate('/plugins' as const)}
						rightElement={
							<Icon
								as={ChevronRightIcon}
								size={20}
								className="text-muted-foreground"
							/>
						}
					/>
				</SettingsSection>

				{/* Downloads Section */}
				<SettingsSection title="Downloads">
					<SettingsItem
						icon={HardDriveIcon}
						title="Storage Used"
						subtitle={`${formatFileSize(stats.totalSize)} · ${stats.completedCount} files`}
					/>
					<SettingsItem
						icon={FolderIcon}
						title="Manage Downloads"
						subtitle="View and manage downloaded tracks"
						onPress={() => router.navigate('/downloads' as const)}
						rightElement={
							<Icon
								as={ChevronRightIcon}
								size={20}
								className="text-muted-foreground"
							/>
						}
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

				{/* Library Section */}
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

				{/* About Section */}
				<SettingsSection title="About">
					<SettingsItem icon={InfoIcon} title="Version" subtitle={appVersion} />
					<SettingsItem
						icon={HeartIcon}
						title="Made with love"
						subtitle="A clean architecture music player"
					/>
				</SettingsSection>

				{/* Footer */}
				<View className="items-center mt-8 px-4">
					<Text variant="muted" className="text-center">
						Aria Music Player
					</Text>
					<Text variant="muted" className="text-center text-xs mt-1">
						Built with Expo, React Native, and TypeScript
					</Text>
				</View>
			</ScrollView>
		</SafeAreaView>
	);
}

// Settings Section Component
function SettingsSection({ title, children }: { title: string; children: React.ReactNode }) {
	return (
		<View className="mt-6">
			<Text className="px-4 mb-2 text-sm font-medium text-muted-foreground uppercase tracking-wide">
				{title}
			</Text>
			<View className="bg-card mx-4 rounded-xl overflow-hidden">{children}</View>
		</View>
	);
}

// Settings Item Component
function SettingsItem({
	icon: IconComponent,
	title,
	subtitle,
	onPress,
	destructive = false,
	rightElement,
}: {
	icon: LucideIcon;
	title: string;
	subtitle?: string;
	onPress?: () => void;
	destructive?: boolean;
	rightElement?: React.ReactNode;
}) {
	const content = (
		<View className="flex-row items-center gap-4 py-4 border-b border-border last:border-b-0">
			<View
				className={`w-10 h-10 rounded-full items-center justify-center ${
					destructive ? 'bg-destructive/10' : 'bg-muted'
				}`}
			>
				<Icon
					as={IconComponent}
					size={20}
					className={destructive ? 'text-destructive' : 'text-foreground'}
				/>
			</View>
			<View className="flex-1">
				<Text className={destructive ? 'text-destructive font-medium' : 'font-medium'}>
					{title}
				</Text>
				{subtitle && (
					<Text variant="muted" numberOfLines={1}>
						{subtitle}
					</Text>
				)}
			</View>
			{rightElement}
		</View>
	);

	if (onPress) {
		return (
			<Button variant="ghost" className="p-0 h-auto rounded-none" onPress={onPress}>
				{content}
			</Button>
		);
	}

	return content;
}
