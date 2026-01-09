/**
 * Toast Component
 *
 * M3-compliant snackbar/toast using React Native Paper.
 * Integrates with the existing toast store.
 */

import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Snackbar, Text } from 'react-native-paper';
import { Portal } from '@rn-primitives/portal';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  useCurrentToast,
  useToastStore,
  type ToastVariant,
} from '@/src/application/state/toast-store';
import { useCurrentTrack } from '@/src/application/state/player-store';
import { usePathname } from 'expo-router';
import { useAppTheme } from '@/lib/theme';
import { TAB_BAR_HEIGHT } from '@/app/(tabs)/_layout';

const FLOATING_PLAYER_HEIGHT = 64;
const FLOATING_PLAYER_MARGIN = 8;
const TOAST_GAP = 8;
const TAB_ROUTES = ['/', '/explore', '/downloads', '/settings'];

/**
 * Get snackbar colors based on variant
 */
function getVariantColors(
  variant: ToastVariant,
  colors: ReturnType<typeof useAppTheme>['colors']
): { backgroundColor: string; textColor: string } {
  switch (variant) {
    case 'error':
      return {
        backgroundColor: colors.errorContainer,
        textColor: colors.onErrorContainer,
      };
    case 'success':
      return {
        backgroundColor: colors.primaryContainer,
        textColor: colors.onPrimaryContainer,
      };
    case 'warning':
      return {
        backgroundColor: colors.tertiaryContainer,
        textColor: colors.onTertiaryContainer,
      };
    case 'info':
      return {
        backgroundColor: colors.secondaryContainer,
        textColor: colors.onSecondaryContainer,
      };
    default:
      return {
        backgroundColor: colors.inverseSurface,
        textColor: colors.inverseOnSurface,
      };
  }
}

export function ToastContainer() {
  const insets = useSafeAreaInsets();
  const currentToast = useCurrentToast();
  const dismiss = useToastStore((state) => state.dismiss);
  const currentTrack = useCurrentTrack();
  const pathname = usePathname();
  const { colors } = useAppTheme();

  const isTabRoute = TAB_ROUTES.includes(pathname);
  const isFloatingPlayerVisible = pathname !== '/player' && currentTrack !== null;

  // Calculate bottom offset based on visible UI elements
  let bottomOffset = TOAST_GAP;

  if (isTabRoute) {
    // Tab bar height already includes safe area insets in its container
    bottomOffset += TAB_BAR_HEIGHT + insets.bottom;
  } else {
    bottomOffset += insets.bottom;
  }

  if (isFloatingPlayerVisible) {
    bottomOffset += FLOATING_PLAYER_HEIGHT + FLOATING_PLAYER_MARGIN;
  }

  const handleDismiss = () => {
    if (currentToast) {
      dismiss(currentToast.id);
    }
  };

  const variantColors = currentToast
    ? getVariantColors(currentToast.variant, colors)
    : { backgroundColor: colors.inverseSurface, textColor: colors.inverseOnSurface };

  // Build display text
  const displayText = currentToast
    ? currentToast.description
      ? `${currentToast.title}\n${currentToast.description}`
      : currentToast.title
    : '';

  return (
    <Portal name="toast-container">
      <View style={[styles.container, { bottom: bottomOffset }]} pointerEvents="box-none">
        <Snackbar
          visible={!!currentToast}
          onDismiss={handleDismiss}
          duration={currentToast?.duration ?? 4000}
          style={[styles.snackbar, { backgroundColor: variantColors.backgroundColor }]}
          wrapperStyle={styles.wrapper}
        >
          <Text style={{ color: variantColors.textColor }}>{displayText}</Text>
        </Snackbar>
      </View>
    </Portal>
  );
}

/**
 * Toast is not used directly - ToastContainer handles rendering
 */
export function Toast() {
  return null;
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 16,
    right: 16,
  },
  wrapper: {
    position: 'relative',
  },
  snackbar: {
    borderRadius: 12,
  },
});
