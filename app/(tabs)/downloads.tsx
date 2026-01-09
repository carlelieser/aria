/**
 * DownloadsScreen
 *
 * Manage downloaded tracks.
 * Uses M3 theming.
 */

import { useState, useMemo, useCallback } from 'react';
import { View, FlatList, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Text, IconButton, SegmentedButtons, Portal, Dialog, Button } from 'react-native-paper';
import { Icon } from '@/components/ui/icon';
import { PageLayout } from '@/components/page-layout';
import { EmptyState } from '@/components/empty-state';
import {
  DownloadIcon,
  TrashIcon,
  HardDriveIcon,
} from 'lucide-react-native';
import { TrackListItem } from '@/components/track-list-item';
import { useDownloadQueue, formatFileSize } from '@/hooks/use-download-queue';
import { useDownloadStore } from '@/src/application/state/download-store';
import { clearAllDownloads } from '@/src/infrastructure/filesystem/download-manager';
import { useToast } from '@/hooks/use-toast';
import { usePlayer } from '@/hooks/use-player';
import { useAppTheme } from '@/lib/theme';
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
  const [clearDialogVisible, setClearDialogVisible] = useState(false);
  const { success, error } = useToast();
  const { play } = usePlayer();
  const { colors } = useAppTheme();

  const { activeDownloads, completedDownloads, failedDownloads, stats } = useDownloadQueue();

  const handleClearAllDownloads = useCallback(async () => {
    setClearDialogVisible(false);
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

  const segmentedButtons = [
    { value: 'active', label: `Active${stats.activeCount > 0 ? ` (${stats.activeCount})` : ''}` },
    { value: 'completed', label: `Done${stats.completedCount > 0 ? ` (${stats.completedCount})` : ''}` },
    { value: 'failed', label: `Failed${stats.failedCount > 0 ? ` (${stats.failedCount})` : ''}` },
  ];

  const headerRightActions = stats.completedCount > 0 ? (
    <IconButton
      icon={() => <Icon as={TrashIcon} size={20} color={colors.onSurfaceVariant} />}
      onPress={() => setClearDialogVisible(true)}
      size={14}
    />
  ) : undefined;

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

      <View style={styles.tabsContainer}>
        <SegmentedButtons
          value={selectedTab}
          onValueChange={(value) => setSelectedTab(value as TabType)}
          buttons={segmentedButtons}
        />
      </View>

      <View style={styles.content}>
        {currentList.length === 0 ? (
          <EmptyState icon={DownloadIcon} {...getEmptyMessage()} />
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

const styles = StyleSheet.create({
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  tabsContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
});
