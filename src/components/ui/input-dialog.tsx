/**
 * InputDialog Component
 *
 * Material 3 styled dialog with text input field.
 */

import { useState, useEffect } from 'react';
import { StyleSheet } from 'react-native';
import { Dialog, Portal, Text, Button, TextInput } from 'react-native-paper';
import { useAppTheme, M3Shapes } from '@/lib/theme';

interface InputDialogProps {
	visible: boolean;
	title: string;
	message?: string;
	placeholder?: string;
	initialValue?: string;
	confirmLabel?: string;
	cancelLabel?: string;
	onConfirm: (value: string) => void;
	onCancel: () => void;
}

export function InputDialog({
	visible,
	title,
	message,
	placeholder,
	initialValue = '',
	confirmLabel = 'Save',
	cancelLabel = 'Cancel',
	onConfirm,
	onCancel,
}: InputDialogProps) {
	const { colors } = useAppTheme();
	const [value, setValue] = useState(initialValue);

	useEffect(() => {
		if (visible) {
			setValue(initialValue);
		}
	}, [visible, initialValue]);

	const handleConfirm = () => {
		const trimmedValue = value.trim();
		if (trimmedValue) {
			onConfirm(trimmedValue);
		}
	};

	const isConfirmDisabled = !value.trim();

	return (
		<Portal>
			<Dialog
				visible={visible}
				onDismiss={onCancel}
				style={[styles.dialog, { backgroundColor: colors.surfaceContainerHigh }]}
			>
				<Dialog.Title style={{ color: colors.onSurface }}>{title}</Dialog.Title>
				<Dialog.Content>
					{message && (
						<Text
							variant="bodyMedium"
							style={[styles.message, { color: colors.onSurfaceVariant }]}
						>
							{message}
						</Text>
					)}
					<TextInput
						value={value}
						onChangeText={setValue}
						placeholder={placeholder}
						mode="outlined"
						autoFocus
						onSubmitEditing={handleConfirm}
						style={styles.input}
					/>
				</Dialog.Content>
				<Dialog.Actions style={styles.actions}>
					<Button mode="text" onPress={onCancel} textColor={colors.onSurfaceVariant}>
						{cancelLabel}
					</Button>
					<Button
						mode="text"
						onPress={handleConfirm}
						textColor={colors.primary}
						disabled={isConfirmDisabled}
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
	message: {
		marginBottom: 16,
	},
	input: {
		marginTop: 8,
	},
	actions: {
		paddingHorizontal: 16,
		paddingBottom: 16,
	},
});
