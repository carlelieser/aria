import { View } from 'react-native';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface PluginItemSkeletonProps {
  /** Whether this is the last item in the list (no bottom border) */
  isLast?: boolean;
}

/**
 * Skeleton loader matching PluginItem layout
 * Layout: [48x48 icon] [flex-1: name+version, status] [switch] [chevron]
 */
export function PluginItemSkeleton({ isLast = false }: PluginItemSkeletonProps) {
  return (
    <View
      className={cn('flex-row items-center gap-4 py-4 px-4', !isLast && 'border-b border-border')}
    >
      {/* Plugin icon */}
      <Skeleton width={48} height={48} rounded="xl" />

      {/* Plugin info */}
      <View className="flex-1 gap-2">
        {/* Name + version row */}
        <View className="flex-row items-center gap-2">
          <Skeleton width="40%" height={16} rounded="sm" />
          <Skeleton width={32} height={12} rounded="sm" />
        </View>
        {/* Status row */}
        <View className="flex-row items-center gap-1">
          <Skeleton width={12} height={12} rounded="full" />
          <Skeleton width={60} height={12} rounded="sm" />
        </View>
      </View>

      {/* Toggle switch */}
      <Skeleton width={51} height={31} rounded="full" />

      {/* Chevron */}
      <Skeleton width={20} height={20} rounded="sm" />
    </View>
  );
}

interface PluginListSkeletonProps {
  /** Number of skeleton items to render */
  count?: number;
}

/**
 * Renders multiple PluginItemSkeleton components for section loading states
 */
export function PluginListSkeleton({ count = 3 }: PluginListSkeletonProps) {
  return (
    <View className="bg-card rounded-xl overflow-hidden">
      {Array.from({ length: count }).map((_, index) => (
        <PluginItemSkeleton key={index} isLast={index === count - 1} />
      ))}
    </View>
  );
}
