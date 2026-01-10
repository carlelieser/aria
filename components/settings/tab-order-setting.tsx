/**
 * TabOrderSetting Component
 *
 * A settings row that opens a bottom sheet for reordering bottom navigation tabs.
 * Uses M3 theming with up/down arrows for reordering.
 */

import { useRef, useCallback } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { Text, Switch } from 'react-native-paper';
import type { BottomSheetMethods } from '@gorhom/bottom-sheet/lib/typescript/types';
import { GripVerticalIcon, ChevronUpIcon, ChevronDownIcon } from 'lucide-react-native';
import { SettingsItem } from '@/components/settings/settings-item';
import { SettingsBottomSheet } from '@/components/settings/settings-bottom-sheet';
import { useAppTheme, M3Shapes } from '@/lib/theme';
import { TAB_CONFIG } from '@/app/(tabs)/_layout';
import {
	type TabId,
	DEFAULT_TAB_ORDER,
	DEFAULT_ENABLED_TABS,
	REQUIRED_TABS,
	useTabOrder,
	useSetTabOrder,
	useResetTabOrder,
	useEnabledTabs,
	useToggleTab,
	useResetEnabledTabs,
} from '@/src/application/state/settings-store';

export function TabOrderSetting() {
	const { colors } = useAppTheme();
	const sheetRef = useRef<BottomSheetMethods>(null);
	const tabOrder = useTabOrder();
	const setTabOrder = useSetTabOrder();
	const resetTabOrder = useResetTabOrder();
	const enabledTabs = useEnabledTabs();
	const toggleTab = useToggleTab();
	const resetEnabledTabs = useResetEnabledTabs();

	const handlePress = useCallback(() => {
		sheetRef.current?.expand();
	}, []);

	const handleMoveUp = useCallback(
		(index: number) => {
			if (index <= 0) return;
			const newOrder = [...tabOrder];
			[newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]];
			setTabOrder(newOrder);
		},
		[tabOrder, setTabOrder]
	);

	const handleMoveDown = useCallback(
		(index: number) => {
			if (index >= tabOrder.length - 1) return;
			const newOrder = [...tabOrder];
			[newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
			setTabOrder(newOrder);
		},
		[tabOrder, setTabOrder]
	);

	const handleReset = useCallback(() => {
		resetTabOrder();
		resetEnabledTabs();
	}, [resetTabOrder, resetEnabledTabs]);

	const handleToggleTab = useCallback(
		(tabId: TabId) => {
			toggleTab(tabId);
		},
		[toggleTab]
	);

	const isDefaultOrder =
		tabOrder.length === DEFAULT_TAB_ORDER.length &&
		tabOrder.every((tab, index) => tab === DEFAULT_TAB_ORDER[index]);

	const isDefaultEnabled =
		enabledTabs.length === DEFAULT_ENABLED_TABS.length &&
		DEFAULT_ENABLED_TABS.every((tab) => enabledTabs.includes(tab));

	const isDefault = isDefaultOrder && isDefaultEnabled;

	const enabledTabsInOrder = tabOrder.filter((id) => enabledTabs.includes(id));
	const orderSummary = enabledTabsInOrder.map((id) => TAB_CONFIG[id].label).join(', ');

	return (
		<>
			<SettingsItem
				icon={GripVerticalIcon}
				title="Tab Order"
				subtitle={orderSummary}
				onPress={handlePress}
				showChevron
			/>

			<SettingsBottomSheet
				ref={sheetRef}
				portalName="tab-order-setting"
				title="Reorder Tabs"
				showReset={!isDefault}
				onReset={handleReset}
			>
				<View style={styles.tabList}>
					{tabOrder.map((tabId, index) => {
						const config = TAB_CONFIG[tabId];
						const TabIcon = config.icon;
						const isFirst = index === 0;
						const isLast = index === tabOrder.length - 1;
						const isEnabled = enabledTabs.includes(tabId);
						const isRequired = REQUIRED_TABS.includes(tabId);

						return (
							<View
								key={tabId}
								style={[
									styles.tabItem,
									{ backgroundColor: colors.surfaceContainerHighest },
									!isEnabled && styles.disabledTab,
								]}
							>
								<View style={styles.tabInfo}>
									<TabIcon
										size={20}
										color={isEnabled ? colors.onSurface : colors.outlineVariant}
									/>
									<Text
										variant="bodyMedium"
										style={[
											styles.tabLabel,
											{
												color: isEnabled
													? colors.onSurface
													: colors.outlineVariant,
											},
										]}
									>
										{config.label}
									</Text>
								</View>
								<View style={styles.tabActions}>
									<Switch
										value={isEnabled}
										onValueChange={() => handleToggleTab(tabId)}
										disabled={isRequired}
										style={styles.switch}
									/>
									<Pressable
										onPress={() => handleMoveUp(index)}
										disabled={isFirst}
										style={({ pressed }) => [
											styles.arrowButton,
											{ backgroundColor: colors.surfaceContainer },
											pressed && !isFirst && styles.pressed,
											isFirst && styles.disabledButton,
										]}
									>
										<ChevronUpIcon
											size={18}
											color={
												isFirst ? colors.outlineVariant : colors.onSurface
											}
										/>
									</Pressable>
									<Pressable
										onPress={() => handleMoveDown(index)}
										disabled={isLast}
										style={({ pressed }) => [
											styles.arrowButton,
											{ backgroundColor: colors.surfaceContainer },
											pressed && !isLast && styles.pressed,
											isLast && styles.disabledButton,
										]}
									>
										<ChevronDownIcon
											size={18}
											color={
												isLast ? colors.outlineVariant : colors.onSurface
											}
										/>
									</Pressable>
								</View>
							</View>
						);
					})}
				</View>
			</SettingsBottomSheet>
		</>
	);
}

const styles = StyleSheet.create({
	pressed: {
		opacity: 0.7,
	},
	tabList: {
		gap: 8,
	},
	tabItem: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingVertical: 12,
		paddingHorizontal: 16,
		borderRadius: M3Shapes.medium,
	},
	tabInfo: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12,
	},
	tabLabel: {
		fontWeight: '500',
	},
	tabActions: {
		flexDirection: 'row',
		gap: 8,
	},
	arrowButton: {
		width: 36,
		height: 36,
		borderRadius: 18,
		alignItems: 'center',
		justifyContent: 'center',
	},
	disabledButton: {
		opacity: 0.5,
	},
	disabledTab: {
		opacity: 0.6,
	},
	switch: {
		marginRight: 4,
	},
});
