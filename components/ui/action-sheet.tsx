/**
 * ActionSheet Component
 *
 * Bottom sheet menu using @gorhom/bottom-sheet with M3 theming.
 */

import React, { forwardRef, useCallback, useMemo } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetScrollView,
  type BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';
import type { BottomSheetMethods } from '@gorhom/bottom-sheet/lib/typescript/types';
import { Portal } from '@rn-primitives/portal';
import { Text, Divider } from 'react-native-paper';
import { Icon } from '@/components/ui/icon';
import { Check } from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import { useAppTheme } from '@/lib/theme';
import { M3Shapes } from '@/lib/theme';

export interface ActionSheetItem {
  id: string;
  label: string;
  icon?: LucideIcon;
  variant?: 'default' | 'destructive';
  disabled?: boolean;
  checked?: boolean;
}

export interface ActionSheetGroup {
  items: ActionSheetItem[];
}

interface ActionSheetProps {
  groups: ActionSheetGroup[];
  onSelect: (itemId: string) => void;
  onDismiss?: () => void;
  header?: React.ReactNode;
  portalName: string;
}

export const ActionSheet = forwardRef<BottomSheetMethods, ActionSheetProps>(
  function ActionSheet({ groups, onSelect, onDismiss, header, portalName }, ref) {
    const { colors } = useAppTheme();

    const snapPoints = useMemo(() => ['75%'], []);

    const handleSheetChanges = useCallback(
      (index: number) => {
        if (index === -1) {
          onDismiss?.();
        }
      },
      [onDismiss]
    );

    const renderBackdrop = useCallback(
      (props: BottomSheetBackdropProps) => (
        <BottomSheetBackdrop
          {...props}
          disappearsOnIndex={-1}
          appearsOnIndex={0}
          opacity={0.5}
        />
      ),
      []
    );

    const handleItemPress = useCallback(
      (itemId: string) => {
        onSelect(itemId);

        if (ref && 'current' in ref && ref.current) {
          ref.current.close();
        }
      },
      [onSelect, ref]
    );

    return (
      <Portal name={`action-sheet-${portalName}`}>
        <BottomSheet
          ref={ref}
          index={-1}
          snapPoints={snapPoints}
          enablePanDownToClose
          backdropComponent={renderBackdrop}
          onChange={handleSheetChanges}
          backgroundStyle={[
            styles.background,
            { backgroundColor: colors.surfaceContainerHigh },
          ]}
          handleIndicatorStyle={[
            styles.handleIndicator,
            { backgroundColor: colors.outlineVariant },
          ]}
        >
          <BottomSheetScrollView style={styles.contentContainer}>
            {header && <View style={styles.header}>{header}</View>}

            <Divider style={{ backgroundColor: colors.outlineVariant }} />

            {groups.map((group, groupIndex) => (
              <View key={groupIndex}>
                {groupIndex > 0 && (
                  <Divider
                    style={[styles.separator, { backgroundColor: colors.outlineVariant }]}
                  />
                )}
                {group.items.map((item) => (
                  <ActionSheetItemComponent
                    key={item.id}
                    item={item}
                    onPress={() => handleItemPress(item.id)}
                    colors={colors}
                  />
                ))}
              </View>
            ))}

            <View style={styles.bottomPadding} />
          </BottomSheetScrollView>
        </BottomSheet>
      </Portal>
    );
  }
);

function ActionSheetItemComponent({
  item,
  onPress,
  colors,
}: {
  item: ActionSheetItem;
  onPress: () => void;
  colors: ReturnType<typeof useAppTheme>['colors'];
}) {
  const isDestructive = item.variant === 'destructive';
  const IconComponent = item.icon;

  const textColor = isDestructive ? colors.error : colors.onSurface;
  const iconColor = isDestructive ? colors.error : colors.onSurfaceVariant;

  return (
    <Pressable
      onPress={onPress}
      disabled={item.disabled}
      style={({ pressed }) => [
        styles.itemContainer,
        {
          backgroundColor: pressed ? colors.surfaceContainerHighest : 'transparent',
          opacity: item.disabled ? 0.5 : 1,
        },
      ]}
    >
      <View style={styles.itemContent}>
        {IconComponent && (
          <View style={styles.iconWrapper}>
            <Icon as={IconComponent} size={22} color={iconColor} />
          </View>
        )}
        <Text
          variant="bodyLarge"
          style={[styles.itemText, { color: textColor }]}
          numberOfLines={1}
        >
          {item.label}
        </Text>
        {item.checked && (
          <View style={styles.checkWrapper}>
            <Icon as={Check} size={20} color={colors.primary} />
          </View>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  background: {
    borderTopLeftRadius: M3Shapes.extraLarge,
    borderTopRightRadius: M3Shapes.extraLarge,
  },
  handleIndicator: {
    width: 36,
    height: 4,
    borderRadius: 2,
  },
  contentContainer: {
    paddingHorizontal: 8,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  separator: {
    marginVertical: 8,
    marginHorizontal: 16,
  },
  bottomPadding: {
    height: 34,
  },
  itemContainer: {
    borderRadius: M3Shapes.medium,
    marginHorizontal: 8,
  },
  itemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  iconWrapper: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  itemText: {
    flex: 1,
  },
  checkWrapper: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
});
