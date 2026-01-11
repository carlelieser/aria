/**
 * SettingsBottomSheet Component
 *
 * A consistent bottom sheet wrapper for settings screens.
 * Uses M3 theming with standardized styling.
 * Only renders when open to avoid gesture handler conflicts.
 */

import { useCallback, useMemo, useRef, useEffect } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import BottomSheet, {
	BottomSheetBackdrop,
	BottomSheetView,
	type BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';
import type { BottomSheetMethods } from '@gorhom/bottom-sheet/lib/typescript/types';
import { Portal } from '@rn-primitives/portal';
import { RotateCcwIcon } from 'lucide-react-native';
import { Icon } from '@/components/ui/icon';
import { useAppTheme, M3Shapes } from '@/lib/theme';

interface SettingsBottomSheetProps {
	isOpen: boolean;
	onClose: () => void;
	portalName: string;
	title: string;
	children: React.ReactNode;
	showReset?: boolean;
	onReset?: () => void;
}

export function SettingsBottomSheet({
	isOpen,
	onClose,
	portalName,
	title,
	children,
	showReset,
	onReset,
}: SettingsBottomSheetProps) {
	const { colors } = useAppTheme();
	const sheetRef = useRef<BottomSheetMethods>(null);
	const snapPoints = useMemo(() => ['50%'], []);

	useEffect(() => {
		if (isOpen) {
			sheetRef.current?.snapToIndex(0);
		}
	}, [isOpen]);

	const handleSheetChanges = useCallback(
		(index: number) => {
			if (index === -1) {
				onClose();
			}
		},
		[onClose]
	);

	const renderBackdrop = useCallback(
		(props: BottomSheetBackdropProps) => (
			<BottomSheetBackdrop
				{...props}
				disappearsOnIndex={-1}
				appearsOnIndex={0}
				opacity={0.5}
				pressBehavior="close"
			/>
		),
		[]
	);

	if (!isOpen) {
		return null;
	}

	return (
		<Portal name={portalName}>
			<BottomSheet
				ref={sheetRef}
				index={0}
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
				<BottomSheetView style={styles.content}>
					<Text
						variant="titleMedium"
						style={[styles.title, { color: colors.onSurface }]}
					>
						{title}
					</Text>

					{children}

					{showReset && onReset && (
						<Pressable
							onPress={onReset}
							style={({ pressed }) => [
								styles.resetButton,
								{ backgroundColor: colors.surfaceContainerHighest },
								pressed && styles.pressed,
							]}
						>
							<Icon
								as={RotateCcwIcon}
								size={18}
								color={colors.onSurfaceVariant}
							/>
							<Text
								variant="labelLarge"
								style={[styles.resetText, { color: colors.onSurfaceVariant }]}
							>
								Reset to Default
							</Text>
						</Pressable>
					)}

					<View style={styles.bottomPadding} />
				</BottomSheetView>
			</BottomSheet>
		</Portal>
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
	content: {
		paddingHorizontal: 24,
	},
	title: {
		fontWeight: '600',
		marginBottom: 20,
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
	resetText: {
		marginLeft: 8,
	},
	pressed: {
		opacity: 0.7,
	},
	bottomPadding: {
		height: 34,
	},
});
