import { View, ScrollView } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeftIcon, SearchIcon, UserIcon } from 'lucide-react-native';

import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { TrackListItem } from '@/components/track-list-item';
import { useTracks } from '@/src/application/state/library-store';
import type { Track } from '@/src/domain/entities/track';

/**
 * Filter tracks by artist ID
 */
function useArtistTracks(artistId: string): Track[] {
  const tracks = useTracks();
  return tracks.filter((track) =>
    track.artists.some((artist) => artist.id === artistId)
  );
}

/**
 * Get artist name from tracks or params
 */
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

  const artistTracks = useArtistTracks(id);
  const artistName = getArtistName(artistTracks, id, name);

  const handleSearchArtist = () => {
    router.push({
      pathname: '/search',
      params: { query: artistName },
    });
  };

  return (
    <View className="flex-1 bg-background">
      {/* Header */}
      <View
        className="px-4 pb-6 bg-secondary rounded-b-3xl"
        style={{ paddingTop: insets.top + 16 }}
      >
        <View className="flex-row items-center gap-3 mb-6">
          <Button
            className="opacity-50"
            size="icon"
            variant="secondary"
            onPress={() => router.back()}
          >
            <Icon as={ChevronLeftIcon} />
          </Button>
          <Text className="text-lg font-medium text-muted-foreground">Artist</Text>
        </View>

        {/* Artist Info */}
        <View className="items-center gap-4">
          <View className="w-24 h-24 rounded-full bg-muted items-center justify-center">
            <Icon as={UserIcon} size={48} className="text-muted-foreground" />
          </View>
          <View className="items-center gap-1">
            <Text className="text-2xl font-bold text-center">{artistName}</Text>
            <Text variant="muted">
              {artistTracks.length} {artistTracks.length === 1 ? 'track' : 'tracks'} in library
            </Text>
          </View>
          <Button variant="outline" onPress={handleSearchArtist}>
            <Icon as={SearchIcon} size={16} className="mr-2" />
            <Text>Search for more</Text>
          </Button>
        </View>
      </View>

      {/* Track List */}
      <ScrollView
        contentContainerClassName="px-4 py-4 gap-2"
        contentContainerStyle={{ paddingBottom: insets.bottom + 80 }}
      >
        {artistTracks.length === 0 ? (
          <View className="py-12 items-center">
            <Text variant="muted">No tracks in library by this artist</Text>
            <Button variant="link" onPress={handleSearchArtist}>
              <Text className="text-primary">Search for tracks</Text>
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
