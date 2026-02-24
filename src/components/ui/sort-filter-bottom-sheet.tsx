/**
 * SortFilterBottomSheet Component
 *
 * Shared bottom sheet wrapper for sort/filter UIs.
 * Encapsulates BottomSheet boilerplate with M3 styling.
 */

import React, { useCallback, useMemo, useRef, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import BottomSheet, {
	BottomSheetBackdrop,
	BottomSheetScrollView,
	type BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';
import type { BottomSheetMethods } from '@gorhom/bottom-sheet/lib/typescript/types';
import { Portal } from '@rn-primitives/portal';
import { Text, Button } from 'react-native-paper';
import { useAppTheme } from '@/lib/theme';

interface SortFilterBottomSheetProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly onClearAll: () => void;
	readonly portalName: string;
	readonly children: React.ReactNode;
}

export function SortFilterBottomSheet({
	isOpen,
	onClose,
	onClearAll,
	portalName,
	children,
}: SortFilterBottomSheetProps) {
	const { colors } = useAppTheme();
	const sheetRef = useRef<BottomSheetMethods>(null);

	const snapPoints = useMemo(() => ['60%', '85%'], []);

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
				pressBehavior={'close'}
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
				<BottomSheetScrollView style={styles.contentContainer}>
					<View style={styles.header}>
						<Text variant={'titleMedium'} style={{ color: colors.onSurface }}>
							Sort & Filter
						</Text>
						<Button
							mode={'text'}
							compact
							onPress={onClearAll}
							textColor={colors.onSurfaceVariant}
						>
							Clear all
						</Button>
					</View>
					{children}
					<View style={styles.bottomPadding} />
				</BottomSheetScrollView>
			</BottomSheet>
		</Portal>
	);
}

const styles = StyleSheet.create({
	background: {
		borderTopLeftRadius: 28,
		borderTopRightRadius: 28,
	},
	handleIndicator: {
		width: 32,
		height: 4,
	},
	contentContainer: {
		flex: 1,
	},
	header: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingHorizontal: 16,
		paddingBottom: 8,
	},
	bottomPadding: {
		height: 34,
	},
});
