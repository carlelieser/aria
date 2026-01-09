/**
 * TrackCard Component
 *
 * Card-style display for tracks in horizontal scrolling lists.
 * Uses M3 theming.
 */

import { memo, useCallback } from 'react';
import { TouchableOpacity, View, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Text } from 'react-native-paper';

import { usePlayer } from '@/hooks/use-player';
import type { Track } from '@/src/domain/entities/track';
import { getBestArtwork } from '@/src/domain/value-objects/artwork';
import { getArtistNames } from '@/src/domain/entities/track';
import { DownloadIndicator } from '@/components/download-indicator';
import { useAppTheme } from '@/lib/theme';
import { M3Shapes } from '@/lib/theme';

interface TrackCardProps {
  track: Track;
  onPress?: (track: Track) => void;
  /** Queue of tracks for skip next/previous functionality */
  queue?: Track[];
  /** Index of this track in the queue */
  queueIndex?: number;
}

export const TrackCard = memo(function TrackCard({
  track,
  onPress,
  queue,
  queueIndex,
}: TrackCardProps) {
  const { play, playQueue } = usePlayer();
  const { colors } = useAppTheme();

  const handlePress = useCallback(() => {
    if (onPress) {
      onPress(track);
      return;
    }
    if (queue && queueIndex !== undefined) {
      playQueue(queue, queueIndex);
    } else {
      play(track);
    }
    router.push('/player');
  }, [onPress, track, play, playQueue, queue, queueIndex]);

  const artwork = getBestArtwork(track.artwork, 120);
  const artworkUrl = artwork?.url;
  const artistNames = getArtistNames(track);

  return (
    <TouchableOpacity style={styles.container} onPress={handlePress} activeOpacity={0.7}>
      <View style={styles.artworkContainer}>
        <Image
          source={{ uri: artworkUrl }}
          style={styles.artwork}
          contentFit="cover"
          transition={200}
          cachePolicy="memory-disk"
          recyclingKey={track.id.value}
        />
        <DownloadIndicator trackId={track.id.value} size="lg" />
      </View>
      <View style={styles.infoContainer}>
        <Text
          variant="labelLarge"
          numberOfLines={1}
          style={{ color: colors.onSurface }}
        >
          {track.title}
        </Text>
        <Text
          variant="bodySmall"
          numberOfLines={1}
          style={{ color: colors.onSurfaceVariant }}
        >
          {artistNames}
        </Text>
      </View>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  container: {
    width: 128,
  },
  artworkContainer: {
    position: 'relative',
  },
  artwork: {
    width: 128,
    height: 128,
    borderRadius: M3Shapes.medium,
  },
  infoContainer: {
    marginTop: 8,
  },
});
