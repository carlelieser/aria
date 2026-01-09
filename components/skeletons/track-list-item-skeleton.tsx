import { View } from 'react-native';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * Skeleton loader matching TrackListItem layout
 * Layout: [48x48 artwork] [flex-1: title + artist] [duration] [options button]
 */
export function TrackListItemSkeleton() {
  return (
    <View className="flex flex-row items-center w-full gap-4 py-4">
      {/* Artwork - 48x48 with rounded-lg */}
      <Skeleton width={48} height={48} rounded="lg" />

      {/* Track info */}
      <View className="flex flex-col gap-2 flex-1">
        {/* Title */}
        <Skeleton width="70%" height={16} rounded="sm" />
        {/* Artist/Album */}
        <Skeleton width="50%" height={14} rounded="sm" />
      </View>

      {/* Duration */}
      <Skeleton width={36} height={14} rounded="sm" />

      {/* Options button placeholder */}
      <Skeleton width={24} height={24} rounded="full" />
    </View>
  );
}

interface TrackListSkeletonProps {
  /** Number of skeleton items to render */
  count?: number;
}

/**
 * Renders multiple TrackListItemSkeleton components for list loading states
 */
export function TrackListSkeleton({ count = 6 }: TrackListSkeletonProps) {
  return (
    <View>
      {Array.from({ length: count }).map((_, index) => (
        <TrackListItemSkeleton key={index} />
      ))}
    </View>
  );
}
