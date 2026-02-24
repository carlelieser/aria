/**
 * TabOrderSetting Component
 *
 * A settings row that opens a bottom sheet for reordering bottom navigation tabs.
 * Uses M3 theming with up/down arrows for reordering.
 */

import { useState, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { GripVerticalIcon } from 'lucide-react-native';
import { SettingsItem } from '@/src/components/settings/settings-item';
import { SettingsBottomSheet } from '@/src/components/settings/settings-bottom-sheet';
import { TAB_CONFIG } from '@/lib/tab-config';
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
import { TabItemRow } from './tab-item-row';

export function TabOrderSetting() {
	const [isOpen, setIsOpen] = useState(false);
	const tabOrder = useTabOrder();
	const setTabOrder = useSetTabOrder();
	const resetTabOrder = useResetTabOrder();
	const enabledTabs = useEnabledTabs();
	const toggleTab = useToggleTab();
	const resetEnabledTabs = useResetEnabledTabs();

	const handlePress = useCallback(() => {
		setIsOpen(true);
	}, []);

	const handleClose = useCallback(() => {
		setIsOpen(false);
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

	const enabledTabsInOrder = tabOrder.filter((id) => enabledTabs.includes(id) && TAB_CONFIG[id]);
	const orderSummary = enabledTabsInOrder.map((id) => TAB_CONFIG[id]?.title ?? id).join(', ');

	return (
		<>
			<SettingsItem
				icon={GripVerticalIcon}
				title={'Tab order'}
				subtitle={orderSummary}
				onPress={handlePress}
				showChevron
			/>

			<SettingsBottomSheet
				isOpen={isOpen}
				onClose={handleClose}
				portalName={'tab-order-setting'}
				title={'Reorder tabs'}
				showReset={!isDefault}
				onReset={handleReset}
			>
				<View style={styles.tabList}>
					{tabOrder.map((tabId, index) => {
						const config = TAB_CONFIG[tabId];
						if (!config?.icon) return null;

						return (
							<TabItemRow
								key={tabId}
								tabId={tabId}
								title={config.title ?? tabId}
								icon={config.icon}
								index={index}
								isFirst={index === 0}
								isLast={index === tabOrder.length - 1}
								isEnabled={enabledTabs.includes(tabId)}
								isRequired={REQUIRED_TABS.includes(tabId)}
								onMoveUp={handleMoveUp}
								onMoveDown={handleMoveDown}
								onToggle={handleToggleTab}
							/>
						);
					})}
				</View>
			</SettingsBottomSheet>
		</>
	);
}

const styles = StyleSheet.create({
	tabList: {
		gap: 8,
	},
});
