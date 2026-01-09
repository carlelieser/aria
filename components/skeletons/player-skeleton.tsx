/**
 * PlayerSkeleton Components
 *
 * Skeleton loading states for player screen.
 * Uses M3 theming.
 */

import { View, StyleSheet } from 'react-native';
import { Skeleton } from '@/components/ui/skeleton';
import { useAppTheme } from '@/lib/theme';

export function PlayerArtworkSkeleton() {
  return (
    <View style={styles.artworkContainer}>
      <Skeleton rounded="2xl" style={styles.artwork} />
    </View>
  );
}

export function PlayerBufferingOverlay() {
  const { colors } = useAppTheme();

  return (
    <View
      style={[
        styles.bufferingOverlay,
        { backgroundColor: `${colors.background}99` },
      ]}
    >
      <Skeleton width={80} height={80} rounded="full" />
    </View>
  );
}

export function PlayerTrackInfoSkeleton() {
  return (
    <View style={styles.trackInfoContainer}>
      <Skeleton width="80%" height={28} rounded="md" />
      <Skeleton width="50%" height={20} rounded="sm" />
      <Skeleton width="40%" height={16} rounded="sm" />
    </View>
  );
}

export function PlayerSkeleton() {
  return (
    <View style={styles.container}>
      <PlayerArtworkSkeleton />
      <PlayerTrackInfoSkeleton />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 32,
  },
  artworkContainer: {
    width: '100%',
    aspectRatio: 1,
  },
  artwork: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  bufferingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
  },
  trackInfoContainer: {
    gap: 12,
    marginTop: 32,
    marginBottom: 24,
  },
});
