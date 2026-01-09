/**
 * PlayerScreen
 *
 * Full player screen with artwork, controls, and progress.
 * Uses M3 theming.
 */

import { View, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useEffect } from 'react';
import { router, usePathname } from 'expo-router';
import { Text, IconButton } from 'react-native-paper';
import { Icon } from '@/components/ui/icon';
import { ChevronLeftIcon } from 'lucide-react-native';
import { PlayerControls } from '@/components/player-controls';
import { ProgressBar } from '@/components/progress-bar';
import { TrackOptionsMenu } from '@/components/track-options-menu';
import { usePlayer } from '@/hooks/use-player';
import { getLargestArtwork } from '@/src/domain/value-objects/artwork';
import { getArtistNames } from '@/src/domain/entities/track';
import { PlayerArtworkSkeleton } from '@/components/skeletons';
import { useAppTheme } from '@/lib/theme';

export default function PlayerScreen() {
  const pathname = usePathname();
  const { currentTrack, isLoading, error } = usePlayer();
  const { colors } = useAppTheme();

  useEffect(() => {
    if (!currentTrack && pathname === '/player') {
      router.back();
    }
  }, [currentTrack, pathname]);

  if (!currentTrack) {
    return null;
  }

  const artwork = getLargestArtwork(currentTrack.artwork);
  const artworkUrl = artwork?.url;
  const artistNames = getArtistNames(currentTrack);
  const albumName = currentTrack.album?.name;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        <View style={styles.header}>
          <IconButton
            icon={() => <Icon as={ChevronLeftIcon} size={24} color={colors.onSurface} />}
            onPress={() => router.back()}
          />
          <Text variant="labelLarge" style={{ color: colors.onSurfaceVariant }}>
            Now Playing
          </Text>
          <TrackOptionsMenu
            track={currentTrack}
            source="player"
            orientation="horizontal"
          />
        </View>

        <View style={styles.artworkContainer}>
          {isLoading ? (
            <PlayerArtworkSkeleton />
          ) : (
            <View style={styles.artworkShadow}>
              <Image
                source={{ uri: artworkUrl }}
                style={styles.artwork}
                contentFit="cover"
                transition={300}
                cachePolicy="memory-disk"
                recyclingKey={currentTrack.id.value}
              />
            </View>
          )}
        </View>

        <View style={styles.trackInfo}>
          <Text
            variant="headlineSmall"
            numberOfLines={2}
            style={{ color: colors.onSurface, fontWeight: '700' }}
          >
            {currentTrack.title}
          </Text>
          <Text
            variant="titleMedium"
            numberOfLines={1}
            style={{ color: colors.onSurfaceVariant }}
          >
            {artistNames}
          </Text>
          {albumName && (
            <Text
              variant="bodySmall"
              numberOfLines={1}
              style={{ color: colors.onSurfaceVariant }}
            >
              {albumName}
            </Text>
          )}
        </View>

        {error && (
          <View style={[styles.errorContainer, { backgroundColor: `${colors.error}1A` }]}>
            <Text variant="bodySmall" style={{ color: colors.error }}>
              {error}
            </Text>
          </View>
        )}

        <View style={styles.progressContainer}>
          <ProgressBar seekable={true} />
        </View>

        <PlayerControls size="lg" />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingTop: 8,
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 32,
  },
  artworkContainer: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
  },
  artworkShadow: {
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.35,
    shadowRadius: 32,
    elevation: 24,
  },
  artwork: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 16,
  },
  trackInfo: {
    gap: 8,
    marginTop: 32,
    marginBottom: 24,
  },
  errorContainer: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  progressContainer: {
    marginBottom: 24,
  },
});
