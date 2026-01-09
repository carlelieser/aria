/**
 * AccentColorPicker Component
 *
 * A settings row that opens a bottom sheet for accent color selection.
 * Uses M3 theming with preset color options.
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
import { ChevronRightIcon, PaletteIcon, RotateCcwIcon } from 'lucide-react-native';
import { Icon } from '@/components/ui/icon';
import { useAppTheme, M3Shapes } from '@/lib/theme';
import { SEED_COLOR } from '@/lib/theme/colors';

const ACCENT_COLORS = [
  { value: '#7C3AED', label: 'Violet', color: '#7C3AED' },
  { value: '#2563EB', label: 'Blue', color: '#2563EB' },
  { value: '#0891B2', label: 'Cyan', color: '#0891B2' },
  { value: '#059669', label: 'Emerald', color: '#059669' },
  { value: '#16A34A', label: 'Green', color: '#16A34A' },
  { value: '#CA8A04', label: 'Yellow', color: '#CA8A04' },
  { value: '#EA580C', label: 'Orange', color: '#EA580C' },
  { value: '#DC2626', label: 'Red', color: '#DC2626' },
  { value: '#DB2777', label: 'Pink', color: '#DB2777' },
  { value: '#9333EA', label: 'Purple', color: '#9333EA' },
  { value: '#4F46E5', label: 'Indigo', color: '#4F46E5' },
  { value: '#64748B', label: 'Slate', color: '#64748B' },
] as const;

interface AccentColorPickerProps {
  value: string | null;
  onValueChange: (color: string | null) => void;
}

export function AccentColorPicker({ value, onValueChange }: AccentColorPickerProps) {
  const { colors } = useAppTheme();
  const sheetRef = useRef<BottomSheetMethods>(null);

  const currentColor = value ?? SEED_COLOR;
  const selectedOption = ACCENT_COLORS.find((c) => c.value === value);

  const handlePress = useCallback(() => {
    sheetRef.current?.expand();
  }, []);

  const handleSelectColor = useCallback(
    (color: string) => {
      onValueChange(color);
      sheetRef.current?.close();
    },
    [onValueChange]
  );

  const handleReset = useCallback(() => {
    onValueChange(null);
    sheetRef.current?.close();
  }, [onValueChange]);

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

  return (
    <>
      <Pressable
        onPress={handlePress}
        style={({ pressed }) => [styles.container, pressed && styles.pressed]}
      >
        <View style={styles.row}>
          <View style={[styles.iconContainer, { backgroundColor: colors.surfaceContainerHighest }]}>
            <Icon as={PaletteIcon} size={20} color={colors.onSurface} />
          </View>
          <View style={styles.content}>
            <Text variant="bodyMedium" style={{ color: colors.onSurface, fontWeight: '500' }}>
              Accent Color
            </Text>
            <View style={styles.valueRow}>
              <View style={[styles.colorDot, { backgroundColor: currentColor }]} />
              <Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>
                {selectedOption?.label ?? 'Default'}
              </Text>
            </View>
          </View>
          <Icon as={ChevronRightIcon} size={20} color={colors.onSurfaceVariant} />
        </View>
      </Pressable>

      <Portal name="accent-color-picker">
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
              Choose Accent Color
            </Text>

            <View style={styles.colorGrid}>
              {ACCENT_COLORS.map((colorOption) => {
                const isSelected = value === colorOption.value;
                return (
                  <Pressable
                    key={colorOption.value}
                    onPress={() => handleSelectColor(colorOption.value)}
                    style={({ pressed }) => [
                      styles.colorItem,
                      pressed && styles.pressed,
                    ]}
                  >
                    <View
                      style={[
                        styles.colorSwatch,
                        { backgroundColor: colorOption.color },
                        isSelected && styles.selectedSwatch,
                        isSelected && { borderColor: colors.onSurface },
                      ]}
                    >
                      {isSelected && (
                        <View style={styles.checkmark}>
                          <Text style={styles.checkmarkText}>✓</Text>
                        </View>
                      )}
                    </View>
                    <Text
                      variant="labelSmall"
                      style={{ color: colors.onSurfaceVariant, textAlign: 'center' }}
                      numberOfLines={1}
                    >
                      {colorOption.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

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
  valueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  colorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
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
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    justifyContent: 'flex-start',
  },
  colorItem: {
    alignItems: 'center',
    width: 64,
  },
  colorSwatch: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginBottom: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedSwatch: {
    borderWidth: 3,
  },
  checkmark: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmarkText: {
    color: '#000',
    fontSize: 14,
    fontWeight: '700',
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: M3Shapes.medium,
    marginTop: 24,
  },
  bottomPadding: {
    height: 34,
  },
});
