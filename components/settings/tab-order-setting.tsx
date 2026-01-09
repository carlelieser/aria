/**
 * TabOrderSetting Component
 *
 * A settings row that opens a bottom sheet for reordering bottom navigation tabs.
 * Uses M3 theming with up/down arrows for reordering.
 */

import { useRef, useCallback } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetView,
  type BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';
import type { BottomSheetMethods } from '@gorhom/bottom-sheet/lib/typescript/types';
import { Portal } from '@rn-primitives/portal';
import {
  ChevronRightIcon,
  GripVerticalIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  RotateCcwIcon,
} from 'lucide-react-native';
import { Icon } from '@/components/ui/icon';
import { useAppTheme, M3Shapes } from '@/lib/theme';
import { TAB_CONFIG } from '@/app/(tabs)/_layout';
import {
  type TabId,
  DEFAULT_TAB_ORDER,
  useTabOrder,
  useSetTabOrder,
  useResetTabOrder,
} from '@/src/application/state/settings-store';

export function TabOrderSetting() {
  const { colors } = useAppTheme();
  const sheetRef = useRef<BottomSheetMethods>(null);
  const tabOrder = useTabOrder();
  const setTabOrder = useSetTabOrder();
  const resetTabOrder = useResetTabOrder();

  const handlePress = useCallback(() => {
    sheetRef.current?.expand();
  }, []);

  const handleMoveUp = useCallback(
    (index: number) => {
      if (index <= 0) return;
      const newOrder = [...tabOrder];
      [newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]];
      setTabOrder(newOrder);
    },
    [tabOrder, setTabOrder]
  );

  const handleMoveDown = useCallback(
    (index: number) => {
      if (index >= tabOrder.length - 1) return;
      const newOrder = [...tabOrder];
      [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
      setTabOrder(newOrder);
    },
    [tabOrder, setTabOrder]
  );

  const handleReset = useCallback(() => {
    resetTabOrder();
  }, [resetTabOrder]);

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

  const isDefaultOrder =
    tabOrder.length === DEFAULT_TAB_ORDER.length &&
    tabOrder.every((tab, index) => tab === DEFAULT_TAB_ORDER[index]);

  const orderSummary = tabOrder.map((id) => TAB_CONFIG[id].label).join(', ');

  return (
    <>
      <Pressable
        onPress={handlePress}
        style={({ pressed }) => [styles.container, pressed && styles.pressed]}
      >
        <View style={styles.row}>
          <View style={[styles.iconContainer, { backgroundColor: colors.surfaceContainerHighest }]}>
            <Icon as={GripVerticalIcon} size={20} color={colors.onSurface} />
          </View>
          <View style={styles.content}>
            <Text variant="bodyMedium" style={{ color: colors.onSurface, fontWeight: '500' }}>
              Tab Order
            </Text>
            <Text
              variant="bodySmall"
              style={{ color: colors.onSurfaceVariant }}
              numberOfLines={1}
            >
              {orderSummary}
            </Text>
          </View>
          <Icon as={ChevronRightIcon} size={20} color={colors.onSurfaceVariant} />
        </View>
      </Pressable>

      <Portal name="tab-order-setting">
        <BottomSheet
          ref={sheetRef}
          index={-1}
          enableDynamicSizing
          enablePanDownToClose
          backdropComponent={renderBackdrop}
          backgroundStyle={[
            styles.background,
            { backgroundColor: colors.surfaceContainerHigh },
          ]}
          handleIndicatorStyle={[
            styles.handleIndicator,
            { backgroundColor: colors.outlineVariant },
          ]}
        >
          <BottomSheetView style={styles.sheetContent}>
            <Text
              variant="titleMedium"
              style={[styles.sheetTitle, { color: colors.onSurface }]}
            >
              Reorder Tabs
            </Text>

            <View style={styles.tabList}>
              {tabOrder.map((tabId, index) => {
                const config = TAB_CONFIG[tabId];
                const TabIcon = config.icon;
                const isFirst = index === 0;
                const isLast = index === tabOrder.length - 1;

                return (
                  <View
                    key={tabId}
                    style={[
                      styles.tabItem,
                      { backgroundColor: colors.surfaceContainerHighest },
                    ]}
                  >
                    <View style={styles.tabInfo}>
                      <TabIcon size={20} color={colors.onSurface} />
                      <Text
                        variant="bodyMedium"
                        style={{ color: colors.onSurface, fontWeight: '500' }}
                      >
                        {config.label}
                      </Text>
                    </View>
                    <View style={styles.tabActions}>
                      <Pressable
                        onPress={() => handleMoveUp(index)}
                        disabled={isFirst}
                        style={({ pressed }) => [
                          styles.arrowButton,
                          { backgroundColor: colors.surfaceContainer },
                          pressed && !isFirst && styles.pressed,
                          isFirst && styles.disabledButton,
                        ]}
                      >
                        <ChevronUpIcon
                          size={18}
                          color={isFirst ? colors.outlineVariant : colors.onSurface}
                        />
                      </Pressable>
                      <Pressable
                        onPress={() => handleMoveDown(index)}
                        disabled={isLast}
                        style={({ pressed }) => [
                          styles.arrowButton,
                          { backgroundColor: colors.surfaceContainer },
                          pressed && !isLast && styles.pressed,
                          isLast && styles.disabledButton,
                        ]}
                      >
                        <ChevronDownIcon
                          size={18}
                          color={isLast ? colors.outlineVariant : colors.onSurface}
                        />
                      </Pressable>
                    </View>
                  </View>
                );
              })}
            </View>

            {!isDefaultOrder && (
              <Pressable
                onPress={handleReset}
                style={({ pressed }) => [
                  styles.resetButton,
                  { backgroundColor: colors.surfaceContainerHighest },
                  pressed && styles.pressed,
                ]}
              >
                <Icon as={RotateCcwIcon} size={18} color={colors.onSurfaceVariant} />
                <Text
                  variant="labelLarge"
                  style={{ color: colors.onSurfaceVariant, marginLeft: 8 }}
                >
                  Reset to Default
                </Text>
              </Pressable>
            )}

            <View style={styles.bottomPadding} />
          </BottomSheetView>
        </BottomSheet>
      </Portal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {},
  pressed: {
    opacity: 0.7,
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
  background: {
    borderTopLeftRadius: M3Shapes.extraLarge,
    borderTopRightRadius: M3Shapes.extraLarge,
  },
  handleIndicator: {
    width: 36,
    height: 4,
    borderRadius: 2,
  },
  sheetContent: {
    paddingHorizontal: 24,
  },
  sheetTitle: {
    fontWeight: '600',
    marginBottom: 20,
  },
  tabList: {
    gap: 8,
  },
  tabItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: M3Shapes.medium,
  },
  tabInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  tabActions: {
    flexDirection: 'row',
    gap: 8,
  },
  arrowButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabledButton: {
    opacity: 0.5,
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: M3Shapes.medium,
    marginTop: 20,
  },
  bottomPadding: {
    height: 34,
  },
});
