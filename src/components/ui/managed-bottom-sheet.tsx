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
import { View, StyleSheet } from 'react-native';
import BottomSheet, {
	BottomSheetBackdrop,
	BottomSheetView,
	BottomSheetScrollView,
	type BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';
import type { BottomSheetMethods } from '@gorhom/bottom-sheet/lib/typescript/types';
import { Portal } from '@rn-primitives/portal';
import { useAppTheme, M3Shapes } from '@/lib/theme';

interface ManagedBottomSheetProps {
	/** Unique portal name for this sheet */
	readonly portalName: string;
	/** Whether the sheet is open */
	readonly isOpen: boolean;
	/** Callback when the sheet is closed */
	readonly onClose: () => void;
	/** Snap points as percentages (e.g., ['60%', '85%']) */
	readonly snapPoints: string[];
	/** Sheet content */
	readonly children: ReactNode;
	/** Use scrollable content view instead of fixed view */
	readonly scrollable?: boolean;
	/** Render children directly inside the sheet without a BottomSheetView wrapper. Use when children contain their own scrollable content (e.g. FlatList). */
	readonly raw?: boolean;
	/** Callback when sheet is opened (after animation) */
	readonly onOpen?: () => void;
	/** Keyboard behavior: 'extend' pushes sheet up, 'interactive' follows keyboard, 'fillParent' expands to full height */
	readonly keyboardBehavior?: 'extend' | 'interactive' | 'fillParent';
	/** What happens when keyboard is dismissed by tapping outside the input */
	readonly keyboardBlurBehavior?: 'none' | 'restore';
	/** Whether panning on the content area moves the sheet (default true). Set false when content has its own gesture handling (e.g. draggable lists). */
	readonly enableContentPanningGesture?: boolean;
}

export function ManagedBottomSheet({
	portalName,
	isOpen,
	onClose,
	snapPoints: snapPointsProp,
	children,
	scrollable = false,
	raw = false,
	onOpen,
	keyboardBehavior,
	keyboardBlurBehavior,
	enableContentPanningGesture,
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
				pressBehavior={'close'}
			/>
		),
		[]
	);

	if (!isOpen) {
		return null;
	}

	const renderContent = () => {
		if (raw) {
			return <View style={styles.content}>{children}</View>;
		}
		const ContentWrapper = scrollable ? BottomSheetScrollView : BottomSheetView;
		return <ContentWrapper style={styles.content}>{children}</ContentWrapper>;
	};

	return (
		<Portal name={portalName}>
			<BottomSheet
				ref={sheetRef}
				index={0}
				snapPoints={snapPoints}
				enableDynamicSizing={false}
				enablePanDownToClose
				enableContentPanningGesture={enableContentPanningGesture}
				backdropComponent={renderBackdrop}
				onChange={handleSheetChanges}
				keyboardBehavior={keyboardBehavior}
				keyboardBlurBehavior={keyboardBlurBehavior}
				backgroundStyle={[
					styles.background,
					{ backgroundColor: colors.surfaceContainerHigh },
				]}
				handleIndicatorStyle={[
					styles.handleIndicator,
					{ backgroundColor: colors.outlineVariant },
				]}
			>
				{renderContent()}
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
