/**
 * ProgressStylePicker Component
 *
 * A settings row that opens a bottom sheet with card-based progress bar
 * style selection. Each card shows a live ProgressTrack preview.
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import BottomSheet, {
	BottomSheetBackdrop,
	BottomSheetScrollView,
	type BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';
import type { BottomSheetMethods } from '@gorhom/bottom-sheet/lib/typescript/types';
import { Portal } from '@rn-primitives/portal';
import { Text, Divider } from 'react-native-paper';
import { AudioWaveformIcon } from 'lucide-react-native';
import { Icon } from '@/src/components/ui/icon';
import { SettingsItem } from '@/src/components/settings/settings-item';
import { useAppTheme, M3Shapes } from '@/lib/theme';
import { StyleCard } from './style-card';
import { STYLE_OPTIONS, type ProgressStylePickerProps } from './types';

export type { ProgressStylePickerProps } from './types';

export function ProgressStylePicker({ value, onValueChange }: ProgressStylePickerProps) {
	const { colors } = useAppTheme();
	const [isOpen, setIsOpen] = useState(false);
	const sheetRef = useRef<BottomSheetMethods>(null);

	const selectedOption = STYLE_OPTIONS.find((o) => o.value === value);

	useEffect(() => {
		if (isOpen) {
			sheetRef.current?.snapToIndex(0);
		}
	}, [isOpen]);

	const handlePress = useCallback(() => {
		setIsOpen(true);
	}, []);

	const handleSheetChanges = useCallback((index: number) => {
		if (index === -1) {
			setIsOpen(false);
		}
	}, []);

	const handleSelectStyle = useCallback(
		(style: (typeof STYLE_OPTIONS)[number]['value']) => {
			onValueChange(style);
			sheetRef.current?.close();
		},
		[onValueChange]
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

	return (
		<>
			<SettingsItem
				icon={AudioWaveformIcon}
				title={'Progress style'}
				subtitle={selectedOption?.label ?? 'Expressive'}
				onPress={handlePress}
				showChevron
			/>

			{isOpen && (
				<Portal name={'action-sheet-progress-style-picker'}>
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
						<BottomSheetScrollView>
							<View style={styles.header}>
								<Icon
									as={AudioWaveformIcon}
									size={22}
									color={colors.onSurfaceVariant}
								/>
								<Text
									variant={'titleMedium'}
									style={[styles.headerTitle, { color: colors.onSurface }]}
								>
									Progress style
								</Text>
							</View>

							<Divider style={{ backgroundColor: colors.outlineVariant }} />

							<View style={styles.cardList}>
								{STYLE_OPTIONS.map((option) => (
									<StyleCard
										key={option.value}
										style={option.value}
										label={option.label}
										isSelected={value === option.value}
										onSelect={handleSelectStyle}
										colors={colors}
									/>
								))}
							</View>

							<View style={styles.bottomPadding} />
						</BottomSheetScrollView>
					</BottomSheet>
				</Portal>
			)}
		</>
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
	header: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12,
		paddingHorizontal: 24,
		paddingVertical: 16,
	},
	headerTitle: {
		fontWeight: '600',
	},
	cardList: {
		paddingHorizontal: 16,
		paddingTop: 16,
		gap: 12,
	},
	bottomPadding: {
		height: 34,
	},
});
