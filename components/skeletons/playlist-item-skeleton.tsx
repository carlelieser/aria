import { View } from 'react-native';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * Skeleton loader matching PlaylistItem layout
 * Layout: [56x56 artwork] [flex-1: name + track count]
 */
export function PlaylistItemSkeleton() {
  return (
    <View className="flex flex-row items-center w-full gap-4 py-4">
      {/* Artwork - 56x56 with rounded-lg */}
      <Skeleton width={56} height={56} rounded="lg" />

      {/* Playlist info */}
      <View className="flex flex-col gap-2 flex-1">
        {/* Name */}
        <Skeleton width="60%" height={16} rounded="sm" />
        {/* Track count */}
        <Skeleton width="30%" height={14} rounded="sm" />
      </View>
    </View>
  );
}

interface PlaylistListSkeletonProps {
  /** Number of skeleton items to render */
  count?: number;
}

/**
 * Renders multiple PlaylistItemSkeleton components for list loading states
 */
export function PlaylistListSkeleton({ count = 5 }: PlaylistListSkeletonProps) {
  return (
    <View>
      {Array.from({ length: count }).map((_, index) => (
        <PlaylistItemSkeleton key={index} />
      ))}
    </View>
  );
}
