/**
 * PluginItemSkeleton Component
 *
 * Skeleton loading state for plugin list items.
 * Uses M3 theming.
 */

import { View, StyleSheet } from 'react-native';
import { Skeleton } from '@/components/ui/skeleton';
import { useAppTheme } from '@/lib/theme';

interface PluginItemSkeletonProps {
  isLast?: boolean;
}

export function PluginItemSkeleton({ isLast = false }: PluginItemSkeletonProps) {
  const { colors } = useAppTheme();

  return (
    <View
      style={[
        styles.container,
        !isLast && { borderBottomWidth: 1, borderBottomColor: colors.outlineVariant },
      ]}
    >
      <Skeleton width={48} height={48} rounded="xl" />

      <View style={styles.textContainer}>
        <View style={styles.titleRow}>
          <Skeleton width="40%" height={16} rounded="sm" />
          <Skeleton width={32} height={12} rounded="sm" />
        </View>
        <View style={styles.subtitleRow}>
          <Skeleton width={12} height={12} rounded="full" />
          <Skeleton width={60} height={12} rounded="sm" />
        </View>
      </View>

      <Skeleton width={51} height={31} rounded="full" />
      <Skeleton width={20} height={20} rounded="sm" />
    </View>
  );
}

interface PluginListSkeletonProps {
  count?: number;
}

export function PluginListSkeleton({ count = 3 }: PluginListSkeletonProps) {
  const { colors } = useAppTheme();

  return (
    <View style={[styles.listContainer, { backgroundColor: colors.surfaceContainerLow }]}>
      {Array.from({ length: count }).map((_, index) => (
        <PluginItemSkeleton key={index} isLast={index === count - 1} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  textContainer: {
    flex: 1,
    gap: 8,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  subtitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  listContainer: {
    borderRadius: 16,
    overflow: 'hidden',
  },
});
