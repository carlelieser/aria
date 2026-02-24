/**
 * ActionSheet Component
 *
 * Bottom sheet menu using @gorhom/bottom-sheet with M3 theming.
 */

import { useCallback, useRef, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import BottomSheet, {
	BottomSheetBackdrop,
	BottomSheetView,
	type BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';
import type { BottomSheetMethods } from '@gorhom/bottom-sheet/lib/typescript/types';
import { Portal } from '@rn-primitives/portal';
import { Divider } from 'react-native-paper';
import { useAppTheme, M3Shapes } from '@/lib/theme';
import { ActionSheetItemComponent } from './action-sheet-item';
import type { ActionSheetProps } from './types';

export type { ActionSheetItem, ActionSheetGroup, ActionSheetProps } from './types';

export function ActionSheet({
	isOpen,
	groups,
	onSelect,
	onClose,
	header,
	portalName,
}: ActionSheetProps) {
	const { colors } = useAppTheme();
	const sheetRef = useRef<BottomSheetMethods>(null);

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
			/>
		),
		[]
	);

	const handleItemPress = useCallback(
		(itemId: string) => {
			onSelect(itemId);
			sheetRef.current?.close();
		},
		[onSelect]
	);

	if (!isOpen) {
		return null;
	}

	return (
		<Portal name={`action-sheet-${portalName}`}>
			<BottomSheet
				ref={sheetRef}
				index={0}
				enableDynamicSizing
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
				<BottomSheetView style={styles.contentContainer}>
					{header && <View style={styles.header}>{header}</View>}

					<Divider style={{ backgroundColor: colors.outlineVariant }} />

					{groups.map((group, groupIndex) => (
						<View key={groupIndex}>
							{groupIndex > 0 && (
								<Divider
									style={[
										styles.separator,
										{ backgroundColor: colors.outlineVariant },
									]}
								/>
							)}
							{group.items.map((item) => (
								<ActionSheetItemComponent
									key={item.id}
									item={item}
									onSelect={handleItemPress}
									colors={colors}
								/>
							))}
						</View>
					))}

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
	contentContainer: {},
	header: {
		paddingHorizontal: 24,
		paddingVertical: 16,
	},
	separator: {
		marginVertical: 8,
		marginHorizontal: 16,
	},
	bottomPadding: {
		height: 34,
	},
});
