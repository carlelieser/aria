/**
 * AccentColorPicker Component
 *
 * A settings row that opens a bottom sheet for accent color selection.
 * Uses M3 theming with preset color options.
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import BottomSheet, {
	BottomSheetBackdrop,
	BottomSheetScrollView,
	type BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';
import type { BottomSheetMethods } from '@gorhom/bottom-sheet/lib/typescript/types';
import { Portal } from '@rn-primitives/portal';
import { Text, Divider } from 'react-native-paper';
import { PaletteIcon, Check } from 'lucide-react-native';
import { Icon } from '@/components/ui/icon';
import { SettingsItem } from '@/components/settings/settings-item';
import { useAppTheme, M3Shapes } from '@/lib/theme';
import { SEED_COLOR } from '@/lib/theme/colors';

const CUSTOM_COLORS = [
	{ value: '#7C3AED', label: 'Violet' },
	{ value: '#2563EB', label: 'Blue' },
	{ value: '#0891B2', label: 'Cyan' },
	{ value: '#059669', label: 'Emerald' },
	{ value: '#16A34A', label: 'Green' },
	{ value: '#CA8A04', label: 'Yellow' },
	{ value: '#EA580C', label: 'Orange' },
	{ value: '#DC2626', label: 'Red' },
	{ value: '#DB2777', label: 'Pink' },
	{ value: '#9333EA', label: 'Purple' },
	{ value: '#4F46E5', label: 'Indigo' },
	{ value: '#64748B', label: 'Slate' },
] as const;

// null = dynamic/Material You colors (wallpaper-extracted on Android 12+)
const DYNAMIC_COLOR = { value: null, label: 'Dynamic', color: SEED_COLOR } as const;

const ALL_COLORS = [...CUSTOM_COLORS.map((c) => ({ ...c, color: c.value })), DYNAMIC_COLOR];

interface AccentColorPickerProps {
	value: string | null;
	onValueChange: (color: string | null) => void;
}

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
			<Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>
				{selectedOption?.label ?? 'Default'}
			</Text>
		</View>
	);

	return (
		<>
			<SettingsItem
				icon={PaletteIcon}
				title="Accent"
				subtitleElement={subtitleElement}
				onPress={handlePress}
				showChevron
			/>

			{isOpen && (
				<Portal name="action-sheet-accent-color-picker">
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
									variant="titleMedium"
									style={[styles.headerTitle, { color: colors.onSurface }]}
								>
									Accent
								</Text>
							</View>

							<Divider style={{ backgroundColor: colors.outlineVariant }} />

							{/* Custom colors */}
							{CUSTOM_COLORS.map((colorOption) => {
								const isSelected = value === colorOption.value;
								return (
									<Pressable
										key={colorOption.value}
										onPress={() => handleSelectColor(colorOption.value)}
										style={({ pressed }) => [
											styles.itemContainer,
											{
												backgroundColor: pressed
													? colors.surfaceContainerHighest
													: 'transparent',
											},
										]}
									>
										<View style={styles.itemContent}>
											<View
												style={[
													styles.colorIndicator,
													{ backgroundColor: colorOption.value },
												]}
											/>
											<Text
												variant="bodyLarge"
												style={[styles.itemText, { color: colors.onSurface }]}
											>
												{colorOption.label}
											</Text>
											{isSelected && (
												<View style={styles.checkWrapper}>
													<Icon as={Check} size={20} color={colors.primary} />
												</View>
											)}
										</View>
									</Pressable>
								);
							})}

							<Divider
								style={[styles.separator, { backgroundColor: colors.outlineVariant }]}
							/>

							{/* Dynamic color */}
							<Pressable
								onPress={() => handleSelectColor(DYNAMIC_COLOR.value)}
								style={({ pressed }) => [
									styles.itemContainer,
									{
										backgroundColor: pressed
											? colors.surfaceContainerHighest
											: 'transparent',
									},
								]}
							>
								<View style={styles.itemContent}>
									<View
										style={[styles.colorIndicator, { backgroundColor: DYNAMIC_COLOR.color }]}
									/>
									<Text
										variant="bodyLarge"
										style={[styles.itemText, { color: colors.onSurface }]}
									>
										{DYNAMIC_COLOR.label}
									</Text>
									{value === DYNAMIC_COLOR.value && (
										<View style={styles.checkWrapper}>
											<Icon as={Check} size={20} color={colors.primary} />
										</View>
									)}
								</View>
							</Pressable>

							<View style={styles.bottomPadding} />
						</BottomSheetScrollView>
					</BottomSheet>
				</Portal>
			)}
		</>
	);
}

const styles = StyleSheet.create({
	valueRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 6,
		marginTop: 2,
	},
	colorDot: {
		width: 12,
		height: 12,
		borderRadius: 6,
	},
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
	separator: {
		marginVertical: 8,
		marginHorizontal: 16,
	},
	bottomPadding: {
		height: 34,
	},
	itemContainer: {
		borderRadius: M3Shapes.medium,
		marginHorizontal: 8,
	},
	itemContent: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingVertical: 14,
		paddingHorizontal: 14,
	},
	colorIndicator: {
		width: 24,
		height: 24,
		borderRadius: 12,
		marginRight: 16,
	},
	itemText: {
		flex: 1,
	},
	checkWrapper: {
		width: 24,
		height: 24,
		alignItems: 'center',
		justifyContent: 'center',
		marginLeft: 8,
	},
});
