/**
 * SortSection Component
 *
 * Sort options for library filtering.
 * Uses M3 theming.
 */

import { View, Pressable, StyleSheet } from 'react-native';
import { Text, IconButton } from 'react-native-paper';
import { Icon } from '@/components/ui/icon';
import { Check, ArrowUp, ArrowDown } from 'lucide-react-native';
import { useAppTheme } from '@/lib/theme';
import type { SortField, SortDirection } from '@/src/domain/utils/track-filtering';

interface SortSectionProps {
  sortField: SortField;
  sortDirection: SortDirection;
  onSortFieldChange: (field: SortField) => void;
  onToggleDirection: () => void;
}

const SORT_OPTIONS: { field: SortField; label: string }[] = [
  { field: 'title', label: 'Title' },
  { field: 'artist', label: 'Artist' },
  { field: 'dateAdded', label: 'Date Added' },
  { field: 'duration', label: 'Duration' },
];

export function SortSection({
  sortField,
  sortDirection,
  onSortFieldChange,
  onToggleDirection,
}: SortSectionProps) {
  const { colors } = useAppTheme();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text
          variant="labelMedium"
          style={[styles.sectionLabel, { color: colors.onSurfaceVariant }]}
        >
          SORT BY
        </Text>
        <Pressable onPress={onToggleDirection} style={styles.directionButton}>
          <Icon
            as={sortDirection === 'asc' ? ArrowUp : ArrowDown}
            size={16}
            color={colors.onSurface}
          />
          <Text variant="bodySmall" style={{ color: colors.onSurface }}>
            {sortDirection === 'asc' ? 'Ascending' : 'Descending'}
          </Text>
        </Pressable>
      </View>
      <View style={styles.options}>
        {SORT_OPTIONS.map((option) => {
          const isSelected = sortField === option.field;
          return (
            <Pressable
              key={option.field}
              style={styles.optionRow}
              onPress={() => onSortFieldChange(option.field)}
            >
              <Text
                variant="bodyMedium"
                style={{
                  color: colors.onSurface,
                  fontWeight: isSelected ? '500' : '400',
                }}
              >
                {option.label}
              </Text>
              {isSelected && <Icon as={Check} size={18} color={colors.primary} />}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionLabel: {
    letterSpacing: 0.5,
  },
  directionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  options: {
    gap: 4,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 4,
  },
});
