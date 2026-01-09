import React, { forwardRef, useCallback, useMemo } from 'react';
import { View, Pressable, StyleSheet, useColorScheme } from 'react-native';
import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetScrollView,
  type BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';
import type { BottomSheetMethods } from '@gorhom/bottom-sheet/lib/typescript/types';
import { Portal } from '@rn-primitives/portal';
import { Text } from '@/components/ui/text';
import { Icon } from '@/components/ui/icon';
import { Check } from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';

/**
 * Action sheet item definition
 */
export interface ActionSheetItem {
  id: string;
  label: string;
  icon?: LucideIcon;
  variant?: 'default' | 'destructive';
  disabled?: boolean;
  checked?: boolean;
}

/**
 * Action sheet group (items with separator)
 */
export interface ActionSheetGroup {
  items: ActionSheetItem[];
}

interface ActionSheetProps {
  /** Groups of action items */
  groups: ActionSheetGroup[];
  /** Called when an action is selected */
  onSelect: (itemId: string) => void;
  /** Called when the sheet is dismissed */
  onDismiss?: () => void;
  /** Optional header content */
  header?: React.ReactNode;
  /** Stable portal name - use a unique ID like track.id to prevent conflicts */
  portalName: string;
}

// Theme colors
const COLORS = {
  light: {
    background: '#ffffff',
    handleIndicator: '#d1d5db',
    separator: '#e5e7eb',
    itemPressed: '#f3f4f6',
  },
  dark: {
    background: '#1c1c1e',
    handleIndicator: '#5c5c5e',
    separator: '#3c3c3e',
    itemPressed: '#2c2c2e',
  },
};

/**
 * Mobile-friendly action sheet using bottom sheet
 */
export const ActionSheet = forwardRef<BottomSheetMethods, ActionSheetProps>(
  function ActionSheet({ groups, onSelect, onDismiss, header, portalName }, ref) {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
    const colors = isDark ? COLORS.dark : COLORS.light;

    // Max height when user expands the sheet
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
        // Close the sheet after selection
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
            { backgroundColor: colors.background },
          ]}
          handleIndicatorStyle={[
            styles.handleIndicator,
            { backgroundColor: colors.handleIndicator },
          ]}
        >
          <BottomSheetScrollView style={styles.contentContainer}>
            {/* Optional header */}
            {header && (
              <View
                style={[styles.header]}
              >
                {header}
              </View>
            )}

            <View
                style={[
                  styles.separator,
                  { backgroundColor: colors.separator },
                ]}
            />

            {groups.map((group, groupIndex) => (
              <View key={groupIndex}>
                {groupIndex > 0 && (
                  <View
                    style={[
                      styles.separator,
                      { backgroundColor: colors.separator },
                    ]}
                  />
                )}
                {group.items.map((item) => (
                  <ActionSheetItemComponent
                    key={item.id}
                    item={item}
                    onPress={() => handleItemPress(item.id)}
                    pressedColor={colors.itemPressed}
                  />
                ))}
              </View>
            ))}

            {/* Bottom padding for safe area */}
            <View style={styles.bottomPadding} />
          </BottomSheetScrollView>
        </BottomSheet>
      </Portal>
    );
  }
);

/**
 * Individual action sheet item
 */
function ActionSheetItemComponent({
  item,
  onPress,
  pressedColor,
}: {
  item: ActionSheetItem;
  onPress: () => void;
  pressedColor: string;
}) {
  const isDestructive = item.variant === 'destructive';
  const IconComponent = item.icon;

  return (
    <Pressable
      onPress={onPress}
      disabled={item.disabled}
      style={({ pressed }) => [
        styles.itemContainer,
        {
          backgroundColor: pressed ? pressedColor : 'transparent',
          opacity: item.disabled ? 0.5 : 1,
        },
      ]}
    >
     <View className={"flex flex-row items-center p-4"}>
       {IconComponent && (
           <View style={styles.iconWrapper}>
             <Icon
                 as={IconComponent}
                 size={22}
                 className={isDestructive ? 'text-destructive' : 'text-foreground'}
             />
           </View>
       )}
       <Text
           className={`flex-1 text-base ${isDestructive ? 'text-destructive' : 'text-foreground'}`}
           numberOfLines={1}
       >
         {item.label}
       </Text>
     </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  background: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  handleIndicator: {
    width: 36,
    height: 5,
  },
  contentContainer: {
    paddingHorizontal: 8,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginVertical: 8,
    marginHorizontal: 16,
  },
  bottomPadding: {
    height: 34,
  },
  itemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginHorizontal: 8,
  },
  iconWrapper: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  checkWrapper: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
});
