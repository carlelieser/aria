import { View } from 'react-native';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * Skeleton for player screen artwork
 * Full-width square with rounded corners
 */
export function PlayerArtworkSkeleton() {
  return (
    <View className="w-full aspect-square">
      <Skeleton rounded="2xl" className="flex-1 w-full h-full" />
    </View>
  );
}

/**
 * Overlay skeleton for buffering state (shows on top of existing artwork)
 */
export function PlayerBufferingOverlay() {
  return (
    <View className="absolute inset-0 items-center justify-center bg-background/60 rounded-2xl">
      <Skeleton width={80} height={80} rounded="full" />
    </View>
  );
}

/**
 * Skeleton for player screen track info (title, artist, album)
 */
export function PlayerTrackInfoSkeleton() {
  return (
    <View className="gap-3 mt-8 mb-6">
      {/* Title - larger text */}
      <Skeleton width="80%" height={28} rounded="md" />
      {/* Artist */}
      <Skeleton width="50%" height={20} rounded="sm" />
      {/* Album - smaller, optional */}
      <Skeleton width="40%" height={16} rounded="sm" />
    </View>
  );
}

/**
 * Combined skeleton for full player loading state
 */
export function PlayerSkeleton() {
  return (
    <View className="flex-1 px-8">
      <PlayerArtworkSkeleton />
      <PlayerTrackInfoSkeleton />
    </View>
  );
}
