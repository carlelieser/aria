/**
 * ArtistScreen
 *
 * Display artist details and tracks.
 * Uses M3 theming.
 */

import { View, ScrollView, StyleSheet } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeftIcon, SearchIcon, UserIcon } from 'lucide-react-native';
import { Text, IconButton, Button } from 'react-native-paper';
import { Icon } from '@/components/ui/icon';
import { TrackListItem } from '@/components/track-list-item';
import { useTracks } from '@/src/application/state/library-store';
import { useAppTheme } from '@/lib/theme';
import type { Track } from '@/src/domain/entities/track';

function useArtistTracks(artistId: string): Track[] {
  const tracks = useTracks();
  return tracks.filter((track) => track.artists.some((artist) => artist.id === artistId));
}

function getArtistName(tracks: Track[], artistId: string, fallbackName?: string): string {
  for (const track of tracks) {
    const artist = track.artists.find((a) => a.id === artistId);
    if (artist) return artist.name;
  }
  return fallbackName ?? 'Unknown Artist';
}

export default function ArtistScreen() {
  const insets = useSafeAreaInsets();
  const { id, name } = useLocalSearchParams<{ id: string; name?: string }>();
  const { colors } = useAppTheme();

  const artistTracks = useArtistTracks(id);
  const artistName = getArtistName(artistTracks, id, name);

  const handleSearchArtist = () => {
    router.push({
      pathname: '/explore',
      params: { query: artistName },
    });
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.header,
          { backgroundColor: colors.surfaceContainerHigh, paddingTop: insets.top + 16 },
        ]}
      >
        <View style={styles.headerRow}>
          <IconButton
            icon={() => <Icon as={ChevronLeftIcon} size={22} color={colors.onSurface} />}
            onPress={() => router.back()}
            style={styles.backButton}
          />
          <Text variant="titleMedium" style={{ color: colors.onSurfaceVariant }}>
            Artist
          </Text>
        </View>

        <View style={styles.artistInfo}>
          <View style={[styles.artistAvatar, { backgroundColor: colors.surfaceContainerHighest }]}>
            <Icon as={UserIcon} size={48} color={colors.onSurfaceVariant} />
          </View>
          <View style={styles.artistText}>
            <Text
              variant="headlineSmall"
              style={{ color: colors.onSurface, fontWeight: '700', textAlign: 'center' }}
            >
              {artistName}
            </Text>
            <Text variant="bodyMedium" style={{ color: colors.onSurfaceVariant }}>
              {artistTracks.length} {artistTracks.length === 1 ? 'track' : 'tracks'} in library
            </Text>
          </View>
          <Button
            mode="outlined"
            icon={() => <Icon as={SearchIcon} size={16} color={colors.primary} />}
            onPress={handleSearchArtist}
          >
            Search for more
          </Button>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 80 }]}
      >
        {artistTracks.length === 0 ? (
          <View style={styles.emptyState}>
            <Text variant="bodyMedium" style={{ color: colors.onSurfaceVariant }}>
              No tracks in library by this artist
            </Text>
            <Button mode="text" onPress={handleSearchArtist}>
              Search for tracks
            </Button>
          </View>
        ) : (
          artistTracks.map((track) => (
            <TrackListItem key={track.id.value} track={track} source="library" />
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 24,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 24,
  },
  backButton: {
    opacity: 0.7,
  },
  artistInfo: {
    alignItems: 'center',
    gap: 16,
  },
  artistAvatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  artistText: {
    alignItems: 'center',
    gap: 4,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 8,
  },
  emptyState: {
    paddingVertical: 48,
    alignItems: 'center',
  },
});
