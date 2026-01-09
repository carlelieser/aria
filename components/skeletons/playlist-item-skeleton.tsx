/**
 * PlaylistItemSkeleton Component
 *
 * Skeleton loading state for playlist list items.
 * Uses M3 theming.
 */

import { View, StyleSheet } from 'react-native';
import { Skeleton } from '@/components/ui/skeleton';

export function PlaylistItemSkeleton() {
  return (
    <View style={styles.container}>
      <Skeleton width={56} height={56} rounded="lg" />

      <View style={styles.textContainer}>
        <Skeleton width="60%" height={16} rounded="sm" />
        <Skeleton width="30%" height={14} rounded="sm" />
      </View>
    </View>
  );
}

interface PlaylistListSkeletonProps {
  count?: number;
}

export function PlaylistListSkeleton({ count = 5 }: PlaylistListSkeletonProps) {
  return (
    <View>
      {Array.from({ length: count }).map((_, index) => (
        <PlaylistItemSkeleton key={index} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    gap: 16,
    paddingVertical: 16,
  },
  textContainer: {
    flex: 1,
    gap: 8,
  },
});
