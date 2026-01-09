/**
 * ExploreScreen
 *
 * Search and explore music with recent activity.
 * Uses M3 theming.
 */

import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScrollView, View, StyleSheet, TextInput } from 'react-native';
import { Text, Button } from 'react-native-paper';
import { Icon } from '@/components/ui/icon';
import {
  SearchXIcon,
  HeartIcon,
  ClockIcon,
  SparklesIcon,
  CompassIcon,
} from 'lucide-react-native';
import { TrackListItem } from '@/components/track-list-item';
import { TrackCard } from '@/components/track-card';
import { useSearch } from '@/hooks/use-search';
import { EmptyState } from '@/components/empty-state';
import { TrackListSkeleton } from '@/components/skeletons';
import { useRecentlyPlayed, useHasHistory } from '@/src/application/state/history-store';
import { getTrackIdString } from '@/src/domain/value-objects/track-id';
import { useFavoriteTracks, useTracks } from '@/src/application/state/library-store';
import { useAppTheme } from '@/lib/theme';
import type { Track } from '@/src/domain/entities/track';
import type { LucideIcon } from 'lucide-react-native';

interface ExploreSectionProps {
  id: string;
  title: string;
  icon: LucideIcon;
  tracks: Track[];
  showSeeAll?: boolean;
  onSeeAll?: () => void;
}

function ExploreSection({
  id,
  title,
  icon: IconComponent,
  tracks,
  showSeeAll,
  onSeeAll,
}: ExploreSectionProps) {
  const { colors } = useAppTheme();

  if (tracks.length === 0) return null;

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionTitleRow}>
          <Icon as={IconComponent} size={18} color={colors.onSurfaceVariant} />
          <Text variant="titleMedium" style={{ color: colors.onSurface, fontWeight: '600' }}>
            {title}
          </Text>
        </View>
        {showSeeAll && onSeeAll && (
          <Button mode="text" compact onPress={onSeeAll} textColor={colors.onSurfaceVariant}>
            See all
          </Button>
        )}
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.horizontalScroll}
      >
        {tracks.map((track) => (
          <TrackCard key={`${id}-${getTrackIdString(track.id)}`} track={track} />
        ))}
      </ScrollView>
    </View>
  );
}

export default function ExploreScreen() {
  const insets = useSafeAreaInsets();
  const { query, tracks, isSearching, error, search } = useSearch();
  const { colors } = useAppTheme();

  const recentlyPlayed = useRecentlyPlayed(10);
  const favoriteTracks = useFavoriteTracks();
  const libraryTracks = useTracks();
  const hasHistory = useHasHistory();

  const recentlyAdded = [...libraryTracks]
    .sort((a, b) => {
      const dateA = a.addedAt ? new Date(a.addedAt).getTime() : 0;
      const dateB = b.addedAt ? new Date(b.addedAt).getTime() : 0;
      return dateB - dateA;
    })
    .slice(0, 10);

  const isExploreMode = query.trim() === '';
  const hasExploreContent = hasHistory || favoriteTracks.length > 0 || recentlyAdded.length > 0;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.headerContainer,
          { backgroundColor: colors.surfaceContainerHigh, paddingTop: insets.top + 16 },
        ]}
      >
        <View style={styles.headerRow}>
          <Icon as={CompassIcon} size={28} color={colors.primary} />
          <Text variant="headlineMedium" style={{ color: colors.onSurface, fontWeight: '700' }}>
            Explore
          </Text>
        </View>
        <View style={styles.searchRow}>
          <TextInput
            value={query}
            onChangeText={search}
            style={[styles.searchInput, { color: colors.onSurface }]}
            placeholderTextColor={colors.onSurfaceVariant}
            placeholder="Search songs, artists, albums..."
            autoFocus={false}
          />
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 20 }]}
      >
        {!isExploreMode && (
          <View style={styles.searchResults}>
            {isSearching && <TrackListSkeleton count={6} />}

            {error && !isSearching && (
              <View style={styles.errorContainer}>
                <Text style={{ color: colors.error }}>Error: {error}</Text>
              </View>
            )}

            {!isSearching && !error && tracks.length === 0 && (
              <EmptyState
                icon={SearchXIcon}
                title="No results found"
                description="Try searching for something else"
              />
            )}

            {!isSearching && !error && tracks.length > 0 && (
              <View style={styles.trackList}>
                {tracks.map((track) => (
                  <TrackListItem
                    key={track.id.value}
                    track={track}
                    source="search"
                  />
                ))}
              </View>
            )}
          </View>
        )}

        {isExploreMode && (
          <>
            {!hasExploreContent && (
              <View style={styles.emptyExplore}>
                <EmptyState
                  icon={SparklesIcon}
                  title="Start exploring"
                  description="Search for music or play some tracks to see your recent activity here"
                />
              </View>
            )}

            {hasExploreContent && (
              <>
                <ExploreSection
                  id="recently-played"
                  title="Recently Played"
                  icon={ClockIcon}
                  tracks={recentlyPlayed}
                />

                <ExploreSection
                  id="favorites"
                  title="Favorites"
                  icon={HeartIcon}
                  tracks={favoriteTracks}
                />

                {recentlyAdded.length > 0 && (
                  <ExploreSection
                    id="recently-added"
                    title="Recently Added"
                    icon={SparklesIcon}
                    tracks={recentlyAdded}
                  />
                )}
              </>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    gap: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    gap: 12,
    width: '100%',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 8,
  },
  scrollContent: {
    gap: 24,
    paddingVertical: 24,
  },
  section: {
    gap: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  horizontalScroll: {
    gap: 16,
    paddingHorizontal: 16,
  },
  searchResults: {
    paddingHorizontal: 16,
  },
  errorContainer: {
    paddingVertical: 32,
    alignItems: 'center',
  },
  trackList: {
    gap: 8,
  },
  emptyExplore: {
    paddingHorizontal: 16,
    paddingTop: 32,
  },
});
