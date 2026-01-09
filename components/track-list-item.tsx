import { TouchableOpacity, View } from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Text } from '@/components/ui/text';
import { usePlayer } from '@/hooks/use-player';
import type { Track } from '@/src/domain/entities/track';
import type { TrackActionSource } from '@/src/domain/actions/track-action';
import { getBestArtwork } from '@/src/domain/value-objects/artwork';
import { getArtistNames } from '@/src/domain/entities/track';
import { TrackOptionsMenu } from '@/components/track-options-menu';

interface TrackListItemProps {
  track: Track;
  /** Source location for track actions context */
  source?: TrackActionSource;
  onPress?: (track: Track) => void;
}

/**
 * Component to display a track in a list with artwork, title, artist, and duration
 */
export function TrackListItem({ track, source = 'library', onPress }: TrackListItemProps) {
  const { play } = usePlayer();

  const handlePress = () => {
    if (onPress) {
      onPress(track);
    } else {
      // Navigate immediately, play in background (metadata already available)
      router.push('/player');
      play(track);
    }
  };

  const artwork = getBestArtwork(track.artwork, 48);
  const artworkUrl = artwork?.url;
  const artistNames = getArtistNames(track);
  const albumName = track.album?.name;
  const duration = track.duration.format();

  return (
    <TouchableOpacity
      className="flex flex-row items-center w-full gap-4 py-4"
      onPress={handlePress}
      activeOpacity={0.7}
    >
      {/* Artwork */}
      <Image
        source={{ uri: artworkUrl }}
        style={{
          width: 48,
          height: 48,
          borderRadius: 8,
        }}
        contentFit="cover"
        transition={200}
      />

      {/* Track info */}
      <View className="flex flex-col gap-1 flex-1">
        <Text numberOfLines={1} className="font-medium">
          {track.title}
        </Text>
        <Text variant="muted" numberOfLines={1}>
          {artistNames}
          {albumName ? ` · ${albumName}` : ''}
        </Text>
      </View>

      {/* Duration */}
      <Text variant="muted" className="text-sm">
        {duration}
      </Text>

      {/* Options menu */}
      <TrackOptionsMenu track={track} source={source} />
    </TouchableOpacity>
  );
}
