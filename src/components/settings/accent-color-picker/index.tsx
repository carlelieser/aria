/**
 * AccentColorPicker Component
 *
 * A settings row that opens a bottom sheet for accent color selection.
 * Uses M3 theming with preset color options.
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { View } from 'react-native';
import BottomSheet, {
	BottomSheetBackdrop,
	BottomSheetScrollView,
	type BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';
import type { BottomSheetMethods } from '@gorhom/bottom-sheet/lib/typescript/types';
import { Portal } from '@rn-primitives/portal';
import { Text, Divider } from 'react-native-paper';
import { PaletteIcon } from 'lucide-react-native';
import { Icon } from '@/src/components/ui/icon';
import { SettingsItem } from '@/src/components/settings/settings-item';
import { useAppTheme } from '@/lib/theme';
import { SEED_COLOR } from '@/lib/theme/colors';
import type { AccentColorPickerProps } from './types';
import { CUSTOM_COLORS, DYNAMIC_COLOR, ALL_COLORS } from './types';
import { ColorOptionItem } from './color-option-item';
import { DynamicColorOption } from './dynamic-color-option';
import { styles } from './styles';

export type { AccentColorPickerProps } from './types';

export function AccentColorPicker({ value, onValueChange }: AccentColorPickerProps) {
	const { colors } = useAppTheme();
	const [isOpen, setIsOpen] = useState(false);
	const sheetRef = useRef<BottomSheetMethods>(null);

	const currentColor = value ?? SEED_COLOR;
	const selectedOption = ALL_COLORS.find((c) => c.value === value);

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

	const handleSelectColor = useCallback(
		(color: string | null) => {
			onValueChange(color);
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

	const subtitleElement = (
		<View style={styles.valueRow}>
			<View style={[styles.colorDot, { backgroundColor: currentColor }]} />
			<Text variant={'bodySmall'} style={{ color: colors.onSurfaceVariant }}>
				{selectedOption?.label ?? 'Default'}
			</Text>
		</View>
	);

	return (
		<>
			<SettingsItem
				icon={PaletteIcon}
				title={'Accent'}
				subtitleElement={subtitleElement}
				onPress={handlePress}
				showChevron
			/>

			{isOpen && (
				<Portal name={'action-sheet-accent-color-picker'}>
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
								<Icon as={PaletteIcon} size={22} color={colors.onSurfaceVariant} />
								<Text
									variant={'titleMedium'}
									style={[styles.headerTitle, { color: colors.onSurface }]}
								>
									Accent
								</Text>
							</View>

							<Divider style={{ backgroundColor: colors.outlineVariant }} />

							{CUSTOM_COLORS.map((colorOption) => (
								<ColorOptionItem
									key={colorOption.value}
									colorValue={colorOption.value}
									label={colorOption.label}
									isSelected={value === colorOption.value}
									onSelect={handleSelectColor}
									colors={colors}
								/>
							))}

							<Divider
								style={[
									styles.separator,
									{ backgroundColor: colors.outlineVariant },
								]}
							/>

							<DynamicColorOption
								isSelected={value === DYNAMIC_COLOR.value}
								onSelect={handleSelectColor}
								dynamicColor={DYNAMIC_COLOR.color}
								colors={colors}
							/>

							<View style={styles.bottomPadding} />
						</BottomSheetScrollView>
					</BottomSheet>
				</Portal>
			)}
		</>
	);
}
