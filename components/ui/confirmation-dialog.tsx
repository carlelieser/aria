/**
 * ConfirmationDialog Component
 *
 * Material 3 styled confirmation dialog using react-native-paper.
 */

import { StyleSheet } from 'react-native';
import { Dialog, Portal, Text, Button } from 'react-native-paper';
import { useAppTheme } from '@/lib/theme';
import { M3Shapes } from '@/lib/theme';

interface ConfirmationDialogProps {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmationDialog({
  visible,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = false,
  onConfirm,
  onCancel,
}: ConfirmationDialogProps) {
  const { colors } = useAppTheme();

  return (
    <Portal>
      <Dialog
        visible={visible}
        onDismiss={onCancel}
        style={[styles.dialog, { backgroundColor: colors.surfaceContainerHigh }]}
      >
        <Dialog.Title style={{ color: colors.onSurface }}>{title}</Dialog.Title>
        <Dialog.Content>
          <Text variant="bodyMedium" style={{ color: colors.onSurfaceVariant }}>
            {message}
          </Text>
        </Dialog.Content>
        <Dialog.Actions style={styles.actions}>
          <Button
            mode="text"
            onPress={onCancel}
            textColor={colors.onSurfaceVariant}
          >
            {cancelLabel}
          </Button>
          <Button
            mode="text"
            onPress={onConfirm}
            textColor={destructive ? colors.error : colors.primary}
          >
            {confirmLabel}
          </Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
}

const styles = StyleSheet.create({
  dialog: {
    borderRadius: M3Shapes.extraLarge,
  },
  actions: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
});
