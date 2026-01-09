import { View } from 'react-native';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * Skeleton loader matching ArtistItem layout
 * Layout: [56x56 circular image] [flex-1: name + track count]
 */
export function ArtistItemSkeleton() {
  return (
    <View className="flex flex-row items-center w-full gap-4 py-4">
      {/* Circular artwork - 56x56 */}
      <Skeleton width={56} height={56} rounded="full" />

      {/* Artist info */}
      <View className="flex flex-col gap-2 flex-1">
        {/* Name */}
        <Skeleton width="55%" height={16} rounded="sm" />
        {/* Track count */}
        <Skeleton width="25%" height={14} rounded="sm" />
      </View>
    </View>
  );
}

interface ArtistListSkeletonProps {
  /** Number of skeleton items to render */
  count?: number;
}

/**
 * Renders multiple ArtistItemSkeleton components for list loading states
 */
export function ArtistListSkeleton({ count = 5 }: ArtistListSkeletonProps) {
  return (
    <View>
      {Array.from({ length: count }).map((_, index) => (
        <ArtistItemSkeleton key={index} />
      ))}
    </View>
  );
}
