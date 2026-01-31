/**
 * ManagedBottomSheet Component
 *
 * A wrapper around @gorhom/bottom-sheet that handles common boilerplate:
 * - Ref management and snap behavior
 * - Open/close state synchronization
 * - Backdrop rendering
 * - Portal wrapping
 * - M3 theming
 */

import { useCallback, useMemo, useRef, useEffect, type ReactNode } from 'react';
import BottomSheet, {
	BottomSheetBackdrop,
	BottomSheetView,
	BottomSheetScrollView,
	type BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';
import type { BottomSheetMethods } from '@gorhom/bottom-sheet/lib/typescript/types';
import { Portal } from '@rn-primitives/portal';
import { StyleSheet } from 'react-native';
import { useAppTheme, M3Shapes } from '@/lib/theme';

interface ManagedBottomSheetProps {
	/** Unique portal name for this sheet */
	portalName: string;
	/** Whether the sheet is open */
	isOpen: boolean;
	/** Callback when the sheet is closed */
	onClose: () => void;
	/** Snap points as percentages (e.g., ['60%', '85%']) */
	snapPoints: string[];
	/** Sheet content */
	children: ReactNode;
	/** Use scrollable content view instead of fixed view */
	scrollable?: boolean;
	/** Callback when sheet is opened (after animation) */
	onOpen?: () => void;
}

export function ManagedBottomSheet({
	portalName,
	isOpen,
	onClose,
	snapPoints: snapPointsProp,
	children,
	scrollable = false,
	onOpen,
}: ManagedBottomSheetProps) {
	const { colors } = useAppTheme();
	const sheetRef = useRef<BottomSheetMethods>(null);
	const snapPoints = useMemo(() => snapPointsProp, [snapPointsProp]);

	useEffect(() => {
		if (isOpen) {
			sheetRef.current?.snapToIndex(0);
			onOpen?.();
		}
	}, [isOpen, onOpen]);

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

	const ContentWrapper = scrollable ? BottomSheetScrollView : BottomSheetView;

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
				<ContentWrapper style={styles.content}>{children}</ContentWrapper>
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
		flex: 1,
		paddingHorizontal: 16,
	},
});
