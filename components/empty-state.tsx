/**
 * EmptyState
 *
 * Shared component for displaying empty states with an icon, title, and description.
 * Used across the app for empty lists, no results, and placeholder content.
 */

import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { Icon } from '@/components/ui/icon';
import { useAppTheme } from '@/lib/theme';
import type { LucideIcon } from 'lucide-react-native';

interface EmptyStateProps {
  /** Icon to display */
  icon: LucideIcon;
  /** Title text */
  title: string;
  /** Description text */
  description: string;
}

export function EmptyState({ icon: IconComponent, title, description }: EmptyStateProps) {
  const { colors } = useAppTheme();

  return (
    <View style={styles.container}>
      <View style={[styles.iconContainer, { backgroundColor: colors.surfaceContainerHighest }]}>
        <Icon as={IconComponent} size={48} color={colors.onSurfaceVariant} />
      </View>
      <Text
        variant="titleLarge"
        style={{ color: colors.onSurface, marginBottom: 8, fontWeight: '600' }}
      >
        {title}
      </Text>
      <Text
        variant="bodyMedium"
        style={{ color: colors.onSurfaceVariant, textAlign: 'center', paddingHorizontal: 32 }}
      >
        {description}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
  },
  iconContainer: {
    borderRadius: 9999,
    padding: 24,
    marginBottom: 16,
  },
});
