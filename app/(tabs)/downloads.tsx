import { useState, useMemo, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, IconButton, Portal, Dialog, Button } from 'react-native-paper';
import { TabsProvider, Tabs, TabScreen } from 'react-native-paper-tabs';
import { Icon } from '@/components/ui/icon';
import { GenericListView } from '@/components/ui/generic-list-view';
import { PageLayout } from '@/components/page-layout';
import { DownloadIcon, TrashIcon, HardDriveIcon, CheckCircle2Icon, AlertCircleIcon, SearchIcon } from 'lucide-react-native';
import { router } from 'expo-router';
import { DownloadListItem } from '@/components/download-list-item';
import { SelectableDownloadListItem } from '@/components/selectable-download-list-item';
import { BatchActionBar } from '@/components/batch-action-bar';
import { useDownloadQueue, formatFileSize } from '@/hooks/use-download-queue';
import { useDownloadActions } from '@/hooks/use-download-actions';
import { useDownloadStore } from '@/src/application/state/download-store';
import { clearAllDownloads } from '@/src/infrastructure/filesystem/download-manager';
import { useToast } from '@/hooks/use-toast';
import { useSelection } from '@/hooks/use-selection';
import { useBatchActions } from '@/hooks/use-batch-actions';
import { useResolvedTracks } from '@/hooks/use-resolved-track';
import { useAppTheme } from '@/lib/theme';
import type { Track } from '@/src/domain/entities/track';
import { createTrackFromDownloadInfo } from '@/src/domain/utils/create-track-from-download';
import type { DownloadInfo } from '@/src/domain/value-objects/download-state';

const BATCH_ACTION_BAR_PADDING = 120;
const DEFAULT_CONTENT_PADDING = 20;

export default function DownloadsScreen() {
	const [tabIndex, setTabIndex] = useState(0);
	const [clearDialogVisible, setClearDialogVisible] = useState(false);
	const { success, error } = useToast();
	const { colors } = useAppTheme();

	const { activeDownloads, completedDownloads, failedDownloads, stats } = useDownloadQueue();
	const { retryDownload } = useDownloadActions();

	const {
		isSelectionMode,
		selectedTrackIds,
		selectedCount,
		enterSelectionMode,
		exitSelectionMode,
		toggleTrackSelection,
	} = useSelection();

	const { addSelectedToLibrary, deleteSelectedDownloads, isDeleting } = useBatchActions();

	const clearAll = useDownloadStore((state) => state.clearAll);

	const handleClearAllDownloads = useCallback(async () => {
		setClearDialogVisible(false);
		const result = await clearAllDownloads();
		if (result.success) {
			clearAll();
			success('Downloads cleared', 'All downloaded files have been removed');
		} else {
			error('Failed to clear downloads', result.error.message);
		}
	}, [clearAll, success, error]);

	const completedTrackIds = useMemo(
		() => completedDownloads.map((d) => d.trackId),
		[completedDownloads]
	);

	const resolvedTracks = useResolvedTracks(completedTrackIds);

	const completedTracksQueue = useMemo(() => {
		return completedDownloads.map((downloadInfo) => {
			const resolved = resolvedTracks.get(downloadInfo.trackId);
			return resolved ?? createTrackFromDownloadInfo(downloadInfo);
		});
	}, [completedDownloads, resolvedTracks]);

	const handleLongPress = useCallback(
		(track: Track) => {
			if (tabIndex === 1) {
				enterSelectionMode(track.id.value);
			}
		},
		[tabIndex, enterSelectionMode]
	);

	const handleRetry = useCallback(
		(track: Track) => {
			retryDownload(track);
		},
		[retryDownload]
	);

	const handleSelectionToggle = useCallback(
		(track: Track) => {
			toggleTrackSelection(track.id.value);
		},
		[toggleTrackSelection]
	);

	const selectedTracks = useMemo(
		() => completedTracksQueue.filter((t) => selectedTrackIds.has(t.id.value)),
		[completedTracksQueue, selectedTrackIds]
	);

	const handleBatchAddToLibrary = useCallback(() => {
		addSelectedToLibrary(selectedTracks);
		exitSelectionMode();
	}, [selectedTracks, addSelectedToLibrary, exitSelectionMode]);

	const handleBatchDeleteDownloads = useCallback(async () => {
		const trackIds = Array.from(selectedTrackIds);
		await deleteSelectedDownloads(trackIds);
		exitSelectionMode();
	}, [selectedTrackIds, deleteSelectedDownloads, exitSelectionMode]);

	const handleSearch = useCallback(() => {
		router.push('/search');
	}, []);

	const headerRightActions = (
		<>
			{stats.completedCount > 0 && (
				<IconButton
					icon={() => <Icon as={TrashIcon} size={20} color={colors.onSurfaceVariant} />}
					onPress={() => setClearDialogVisible(true)}
				/>
			)}
			<IconButton
				icon={() => <Icon as={SearchIcon} size={22} color={colors.onSurfaceVariant} />}
				onPress={handleSearch}
			/>
		</>
	);

	// Note: Labels must be static strings because react-native-paper-tabs uses them as React keys.
	// Dynamic labels (with counts) cause react-native-pager-view to fire onPageSelected incorrectly
	// when content changes. See: https://github.com/callstack/react-native-pager-view/issues/84
	const activeLabel = 'Active';
	const doneLabel = 'Done';
	const failedLabel = 'Failed';

	return (
		<PageLayout
			header={{
				icon: DownloadIcon,
				title: 'Downloads',
				rightActions: headerRightActions,
			}}
		>
			<View style={[styles.statsRow, { borderBottomColor: colors.outlineVariant }]}>
				<Icon as={HardDriveIcon} size={16} color={colors.onSurfaceVariant} />
				<Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>
					{formatFileSize(stats.totalSize)} used · {stats.completedCount} files
				</Text>
			</View>

			<View style={styles.content}>
				<TabsProvider defaultIndex={tabIndex} onChangeIndex={setTabIndex}>
					<Tabs
						uppercase={false}
						mode="fixed"
						style={{ backgroundColor: colors.surface }}
					>
						<TabScreen label={activeLabel} icon="download" badge={stats.activeCount || undefined}>
							<View style={styles.tabContent}>
								<ActiveDownloadsList downloads={activeDownloads} />
							</View>
						</TabScreen>
						<TabScreen label={doneLabel} icon="check-circle" badge={stats.completedCount || undefined}>
							<View style={styles.tabContent}>
								<CompletedDownloadsList
									downloads={completedDownloads}
									tracksQueue={completedTracksQueue}
									isSelectionMode={isSelectionMode}
									selectedTrackIds={selectedTrackIds}
									onLongPress={handleLongPress}
									onSelectionToggle={handleSelectionToggle}
								/>
							</View>
						</TabScreen>
						<TabScreen label={failedLabel} icon="alert-circle" badge={stats.failedCount || undefined}>
							<View style={styles.tabContent}>
								<FailedDownloadsList
									downloads={failedDownloads}
									onRetry={handleRetry}
								/>
							</View>
						</TabScreen>
					</Tabs>
				</TabsProvider>
			</View>

			<BatchActionBar
				context="downloads"
				selectedCount={selectedCount}
				onCancel={exitSelectionMode}
				onAddToLibrary={handleBatchAddToLibrary}
				onDeleteDownloads={handleBatchDeleteDownloads}
				isProcessing={isDeleting}
			/>

			<Portal>
				<Dialog visible={clearDialogVisible} onDismiss={() => setClearDialogVisible(false)}>
					<Dialog.Title>Clear All Downloads</Dialog.Title>
					<Dialog.Content>
						<Text variant="bodyMedium">
							This will remove all downloaded files. This action cannot be undone.
						</Text>
					</Dialog.Content>
					<Dialog.Actions>
						<Button onPress={() => setClearDialogVisible(false)}>Cancel</Button>
						<Button onPress={handleClearAllDownloads} textColor={colors.error}>
							Clear All
						</Button>
					</Dialog.Actions>
				</Dialog>
			</Portal>
		</PageLayout>
	);
}

interface ActiveDownloadsListProps {
	downloads: DownloadInfo[];
}

function ActiveDownloadsList({ downloads }: ActiveDownloadsListProps) {
	return (
		<GenericListView
			data={downloads}
			isLoading={false}
			keyExtractor={(item) => item.trackId}
			renderItem={({ item }) => <DownloadListItem downloadInfo={item} />}
			loadingSkeleton={null}
			emptyState={{
				icon: DownloadIcon,
				title: 'No active downloads',
				description: 'Downloads will appear here when you start downloading tracks',
			}}
			contentContainerStyle={{ paddingBottom: DEFAULT_CONTENT_PADDING }}
			disablePlayerAwarePadding
		/>
	);
}

interface CompletedDownloadsListProps {
	downloads: DownloadInfo[];
	tracksQueue: Track[];
	isSelectionMode: boolean;
	selectedTrackIds: Set<string>;
	onLongPress: (track: Track) => void;
	onSelectionToggle: (track: Track) => void;
}

function CompletedDownloadsList({
	downloads,
	tracksQueue,
	isSelectionMode,
	selectedTrackIds,
	onLongPress,
	onSelectionToggle,
}: CompletedDownloadsListProps) {
	return (
		<GenericListView
			data={downloads}
			isLoading={false}
			keyExtractor={(item) => item.trackId}
			renderItem={({ item, index }) => (
				<SelectableDownloadListItem
					downloadInfo={item}
					isSelectionMode={isSelectionMode}
					isSelected={selectedTrackIds.has(item.trackId)}
					onLongPress={onLongPress}
					onSelectionToggle={onSelectionToggle}
					queue={tracksQueue}
					queueIndex={index}
				/>
			)}
			loadingSkeleton={null}
			emptyState={{
				icon: CheckCircle2Icon,
				title: 'No completed downloads',
				description: 'Completed downloads will appear here',
			}}
			contentContainerStyle={{
				paddingBottom: isSelectionMode ? BATCH_ACTION_BAR_PADDING : DEFAULT_CONTENT_PADDING,
			}}
			extraData={isSelectionMode ? selectedTrackIds : undefined}
			disablePlayerAwarePadding
		/>
	);
}

interface FailedDownloadsListProps {
	downloads: DownloadInfo[];
	onRetry: (track: Track) => void;
}

function FailedDownloadsList({ downloads, onRetry }: FailedDownloadsListProps) {
	return (
		<GenericListView
			data={downloads}
			isLoading={false}
			keyExtractor={(item) => item.trackId}
			renderItem={({ item }) => <DownloadListItem downloadInfo={item} onRetry={onRetry} />}
			loadingSkeleton={null}
			emptyState={{
				icon: AlertCircleIcon,
				title: 'No failed downloads',
				description: 'Failed downloads will appear here for retry',
			}}
			contentContainerStyle={{ paddingBottom: DEFAULT_CONTENT_PADDING }}
			disablePlayerAwarePadding
		/>
	);
}

const styles = StyleSheet.create({
	statsRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
		paddingHorizontal: 16,
		paddingVertical: 12,
		borderBottomWidth: 1,
	},
	content: {
		flex: 1,
	},
	tabContent: {
		flex: 1,
		paddingHorizontal: 16,
	},
});
