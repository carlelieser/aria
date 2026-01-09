/**
 * SettingsSelect Component
 *
 * A settings row that opens an action sheet for selection.
 * Uses M3 theming.
 */

import { useRef, useCallback } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import type { BottomSheetMethods } from '@gorhom/bottom-sheet/lib/typescript/types';
import { ChevronRightIcon, type LucideIcon } from 'lucide-react-native';
import { Icon } from '@/components/ui/icon';
import { ActionSheet, type ActionSheetGroup } from '@/components/ui/action-sheet';
import { useAppTheme } from '@/lib/theme';

interface SelectOption<T extends string> {
  value: T;
  label: string;
  icon?: LucideIcon;
}

interface SettingsSelectProps<T extends string> {
  /** Icon for the settings row */
  icon: LucideIcon;
  /** Title of the setting */
  title: string;
  /** Available options */
  options: SelectOption<T>[];
  /** Currently selected value */
  value: T;
  /** Callback when value changes */
  onValueChange: (value: T) => void;
  /** Unique identifier for the action sheet portal */
  portalName: string;
}

export function SettingsSelect<T extends string>({
  icon: IconComponent,
  title,
  options,
  value,
  onValueChange,
  portalName,
}: SettingsSelectProps<T>) {
  const { colors } = useAppTheme();
  const sheetRef = useRef<BottomSheetMethods>(null);

  const selectedOption = options.find((opt) => opt.value === value);
  const selectedLabel = selectedOption?.label ?? value;

  const handlePress = useCallback(() => {
    sheetRef.current?.expand();
  }, []);

  const handleSelect = useCallback(
    (itemId: string) => {
      onValueChange(itemId as T);
    },
    [onValueChange]
  );

  const groups: ActionSheetGroup[] = [
    {
      items: options.map((option) => ({
        id: option.value,
        label: option.label,
        icon: option.icon,
        checked: option.value === value,
      })),
    },
  ];

  const header = (
    <View style={styles.header}>
      <Icon as={IconComponent} size={22} color={colors.onSurfaceVariant} />
      <Text variant="titleMedium" style={{ color: colors.onSurface, fontWeight: '600' }}>
        {title}
      </Text>
    </View>
  );

  return (
    <>
      <Pressable
        onPress={handlePress}
        style={({ pressed }) => [styles.container, pressed && styles.pressed]}
      >
        <View style={styles.row}>
          <View style={[styles.iconContainer, { backgroundColor: colors.surfaceContainerHighest }]}>
            <Icon as={IconComponent} size={20} color={colors.onSurface} />
          </View>
          <View style={styles.content}>
            <Text variant="bodyMedium" style={{ color: colors.onSurface, fontWeight: '500' }}>
              {title}
            </Text>
            <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>
              {selectedLabel}
            </Text>
          </View>
          <Icon as={ChevronRightIcon} size={20} color={colors.onSurfaceVariant} />
        </View>
      </Pressable>

      <ActionSheet
        ref={sheetRef}
        groups={groups}
        onSelect={handleSelect}
        header={header}
        portalName={portalName}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {},
  pressed: {
    opacity: 0.7,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
  },
});
