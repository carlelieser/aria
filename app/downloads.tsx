import { useState, useMemo, useCallback } from 'react';
import { View, FlatList, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { Icon } from '@/components/ui/icon';
import {
	ChevronLeftIcon,
	DownloadIcon,
	CheckCircleIcon,
	AlertCircleIcon,
	TrashIcon,
	HardDriveIcon,
} from 'lucide-react-native';
import { TrackListItem } from '@/components/track-list-item';
import { useDownloadQueue, formatFileSize } from '@/hooks/use-download-queue';
import { useDownloadStore } from '@/src/application/state/download-store';
import { clearAllDownloads } from '@/src/infrastructure/filesystem/download-manager';
import { useToast } from '@/hooks/use-toast';
import { usePlayer } from '@/hooks/use-player';
import type { DownloadInfo } from '@/src/domain/value-objects/download-state';
import type { Track } from '@/src/domain/entities/track';
import { createTrack } from '@/src/domain/entities/track';
import { TrackId } from '@/src/domain/value-objects/track-id';
import { Duration } from '@/src/domain/value-objects/duration';

type TabType = 'active' | 'completed' | 'failed';

const DOWNLOAD_ITEM_HEIGHT = 80;

function createTrackFromDownloadInfo(info: DownloadInfo): Track {
	const trackId = TrackId.tryFromString(info.trackId) ?? TrackId.create('unknown', info.trackId);

	return createTrack({
		id: trackId,
		title: info.title,
		artists: [{ id: 'unknown', name: info.artistName }],
		duration: Duration.ZERO,
		artwork: info.artworkUrl ? [{ url: info.artworkUrl, width: 48, height: 48 }] : undefined,
		source: {
			type: 'streaming',
			sourcePlugin: trackId.sourceType,
			sourceId: trackId.sourceId,
		},
	});
}

export default function DownloadsScreen() {
	const [selectedTab, setSelectedTab] = useState<TabType>('active');
	const { success, error } = useToast();
	const { play } = usePlayer();

	const { activeDownloads, completedDownloads, failedDownloads, stats } = useDownloadQueue();

	const handleClearAllDownloads = useCallback(() => {
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
	}, [success, error]);

	const currentList = useMemo(() => {
		switch (selectedTab) {
			case 'active':
				return activeDownloads;
			case 'completed':
				return completedDownloads;
			case 'failed':
				return failedDownloads;
			default:
				return [];
		}
	}, [selectedTab, activeDownloads, completedDownloads, failedDownloads]);

	const handleTrackPress = useCallback(
		(track: Track) => {
			if (selectedTab === 'completed') {
				router.push('/player');
				play(track);
			}
		},
		[selectedTab, play]
	);

	const getEmptyMessage = () => {
		switch (selectedTab) {
			case 'active':
				return {
					title: 'No active downloads',
					description: 'Downloads will appear here when you start downloading tracks',
				};
			case 'completed':
				return {
					title: 'No completed downloads',
					description: 'Completed downloads will appear here',
				};
			case 'failed':
				return {
					title: 'No failed downloads',
					description: 'Failed downloads will appear here for retry',
				};
		}
	};

	const tabs: { key: TabType; label: string; count: number; icon: typeof DownloadIcon }[] = [
		{ key: 'active', label: 'Active', count: stats.activeCount, icon: DownloadIcon },
		{ key: 'completed', label: 'Completed', count: stats.completedCount, icon: CheckCircleIcon },
		{ key: 'failed', label: 'Failed', count: stats.failedCount, icon: AlertCircleIcon },
	];

	return (
		<SafeAreaView className="bg-background flex-1">
			<View className="flex-row items-center justify-between p-4 border-b border-border">
				<View className="flex-row items-center gap-2">
					<Button variant="ghost" size="icon" onPress={() => router.back()}>
						<Icon as={ChevronLeftIcon} />
					</Button>
					<Text className="text-xl font-semibold">Downloads</Text>
				</View>
				{stats.completedCount > 0 && (
					<Button variant="ghost" size="icon" onPress={handleClearAllDownloads}>
						<Icon as={TrashIcon} className="text-muted-foreground" />
					</Button>
				)}
			</View>

			<View className="px-4 py-3 border-b border-border">
				<View className="flex-row items-center gap-2">
					<Icon as={HardDriveIcon} size={16} className="text-muted-foreground" />
					<Text variant="muted" className="text-sm">
						{formatFileSize(stats.totalSize)} used · {stats.completedCount} files
					</Text>
				</View>
			</View>

			<View className="flex-row gap-2 px-4 py-3">
				{tabs.map((tab) => {
					const isSelected = tab.key === selectedTab;
					const variant = isSelected ? 'default' : 'secondary';

					return (
						<Button
							key={tab.key}
							variant={variant}
							onPress={() => setSelectedTab(tab.key)}
							className="flex-row gap-2"
						>
							<Icon
								as={tab.icon}
								size={16}
								className={isSelected ? 'text-primary-foreground' : 'text-foreground'}
							/>
							<Text className={isSelected ? 'text-primary-foreground' : ''}>
								{tab.label}
								{tab.count > 0 && ` (${tab.count})`}
							</Text>
						</Button>
					);
				})}
			</View>

			<View className="flex-1 px-4">
				{currentList.length === 0 ? (
					<EmptyState {...getEmptyMessage()} />
				) : (
					<FlatList
						data={currentList}
						keyExtractor={(item) => item.trackId}
						renderItem={({ item }) => (
							<TrackListItem
								track={createTrackFromDownloadInfo(item)}
								downloadInfo={item}
								onPress={selectedTab === 'completed' ? handleTrackPress : undefined}
							/>
						)}
						getItemLayout={(_, index) => ({
							length: DOWNLOAD_ITEM_HEIGHT,
							offset: DOWNLOAD_ITEM_HEIGHT * index,
							index,
						})}
						showsVerticalScrollIndicator={false}
						contentContainerStyle={{ paddingBottom: 20 }}
					/>
				)}
			</View>
		</SafeAreaView>
	);
}

function EmptyState({ title, description }: { title: string; description: string }) {
	return (
		<View className="flex-1 items-center justify-center py-16">
			<View className="bg-muted rounded-full p-6 mb-4">
				<Icon as={DownloadIcon} size={48} className="text-muted-foreground" />
			</View>
			<Text className="text-xl font-semibold mb-2">{title}</Text>
			<Text variant="muted" className="text-center px-8">
				{description}
			</Text>
		</View>
	);
}
