import { TouchableOpacity, View } from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Text } from '@/components/ui/text';
import { usePlayer } from '@/hooks/use-player';
import type { Track } from '@/src/domain/entities/track';
import { getBestArtwork } from '@/src/domain/value-objects/artwork';
import { getArtistNames } from '@/src/domain/entities/track';

interface TrackCardProps {
  track: Track;
  onPress?: (track: Track) => void;
}

/**
 * Compact track card for horizontal scrolling sections
 */
export function TrackCard({ track, onPress }: TrackCardProps) {
  const { play } = usePlayer();

  const handlePress = () => {
    if (onPress) {
      onPress(track);
    } else {
      router.push('/player');
      play(track);
    }
  };

  const artwork = getBestArtwork(track.artwork, 120);
  const artworkUrl = artwork?.url;
  const artistNames = getArtistNames(track);

  return (
    <TouchableOpacity
      className="w-32"
      onPress={handlePress}
      activeOpacity={0.7}
    >
      <Image
        source={{ uri: artworkUrl }}
        style={{
          width: 128,
          height: 128,
          borderRadius: 12,
        }}
        contentFit="cover"
        transition={200}
      />
      <View className="mt-2">
        <Text numberOfLines={1} className="font-medium text-sm">
          {track.title}
        </Text>
        <Text variant="muted" numberOfLines={1} className="text-xs">
          {artistNames}
        </Text>
      </View>
    </TouchableOpacity>
  );
}
