/**
 * Tab Layout
 *
 * Material 3 bottom navigation with Library, Explore, Downloads, and Settings tabs.
 * Features a sliding animated indicator that transitions between tabs.
 * Tab order is customizable via settings.
 */

import { useEffect, useRef, useCallback, useMemo, useState } from 'react';
import { Tabs, router } from 'expo-router';
import { View, Pressable, StyleSheet, Text, InteractionManager } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
	useAnimatedStyle,
	useSharedValue,
	withSpring,
	FadeIn,
	FadeOut,
} from 'react-native-reanimated';
import { useAppTheme } from '@/lib/theme';
import { useDownloadQueue } from '@/hooks/use-download-queue';
import {
	useDefaultTab,
	useTabOrder,
	useEnabledTabs,
	useSettingsStore,
	type TabId,
	DEFAULT_TAB_ORDER,
} from '@/src/application/state/settings-store';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { TAB_CONFIG, TAB_BAR_HEIGHT } from '@/lib/tab-config';

const TAB_WIDTH = 84;
const INDICATOR_WIDTH = 64;
const INDICATOR_HEIGHT = 32;

export default function TabLayout() {
	const defaultTab = useDefaultTab();
	const tabOrder = useTabOrder();
	const enabledTabs = useEnabledTabs();
	const hasNavigatedRef = useRef(false);
	const [isHydrated, setIsHydrated] = useState(useSettingsStore.persist.hasHydrated());

	// Wait for store hydration before attempting navigation
	useEffect(() => {
		// If already hydrated, nothing to do
		if (useSettingsStore.persist.hasHydrated()) {
			setIsHydrated(true);
			return;
		}

		// Subscribe to hydration completion
		const unsubscribe = useSettingsStore.persist.onFinishHydration(() => {
			// Use InteractionManager to ensure we don't navigate during transitions
			InteractionManager.runAfterInteractions(() => {
				setIsHydrated(true);
			});
		});

		return unsubscribe;
	}, []);

	// Ensure tab order is valid and filter by enabled tabs
	const validTabOrder = useMemo(() => {
		const validTabs = tabOrder.filter((id) => id in TAB_CONFIG);
		if (validTabs.length !== DEFAULT_TAB_ORDER.length) {
			return DEFAULT_TAB_ORDER.filter((id) => enabledTabs.includes(id));
		}
		return validTabs.filter((id) => enabledTabs.includes(id));
	}, [tabOrder, enabledTabs]);

	useEffect(() => {
		// Only navigate after hydration is complete and interactions are done
		if (!isHydrated || hasNavigatedRef.current) return;

		// Check if we need to navigate to a different default tab
		if (defaultTab !== validTabOrder[0]) {
			hasNavigatedRef.current = true;
			// If default tab is disabled, use first enabled tab
			const targetTab = enabledTabs.includes(defaultTab) ? defaultTab : validTabOrder[0];
			const config = TAB_CONFIG[targetTab];
			if (config) {
				// Use InteractionManager to ensure navigation happens after all animations complete
				const handle = InteractionManager.runAfterInteractions(() => {
					router.replace(config.route as '/' | '/explore' | '/downloads' | '/settings');
				});
				return () => handle.cancel();
			}
		}
	}, [isHydrated, defaultTab, validTabOrder, enabledTabs]);

	return (
		<Tabs
			screenOptions={{ headerShown: false, animation: "shift" }}
			tabBar={(props) => <CustomTabBar {...props} tabOrder={validTabOrder} />}
		>
			{validTabOrder.map((tabId) => (
				<Tabs.Screen
					key={tabId}
					name={tabId}
					options={{ title: TAB_CONFIG[tabId].label }}
				/>
			))}
		</Tabs>
	);
}

interface CustomTabBarProps extends BottomTabBarProps {
	tabOrder: TabId[];
}

function CustomTabBar({ state, navigation, tabOrder }: CustomTabBarProps) {
	const { colors } = useAppTheme();
	const insets = useSafeAreaInsets();
	const { hasActiveDownloads } = useDownloadQueue();
	const tabBarHeight = TAB_BAR_HEIGHT + insets.bottom;

	const indicatorX = useSharedValue(state.index * TAB_WIDTH + (TAB_WIDTH - INDICATOR_WIDTH) / 2);

	useEffect(() => {
		const newX = state.index * TAB_WIDTH + (TAB_WIDTH - INDICATOR_WIDTH) / 2;
		indicatorX.value = withSpring(newX, {
			damping: 25,
			stiffness: 180,
			mass: 0.5,
		});
	}, [state.index, indicatorX]);

	const animatedIndicatorStyle = useAnimatedStyle(() => {
		return {
			transform: [{ translateX: indicatorX.value }],
		};
	});

	const handleTabPress = useCallback(
		(index: number, routeName: string) => {
			const newX = index * TAB_WIDTH + (TAB_WIDTH - INDICATOR_WIDTH) / 2;
			indicatorX.value = withSpring(newX, {
				damping: 25,
				stiffness: 180,
				mass: 0.5,
			});

			const event = navigation.emit({
				type: 'tabPress',
				target: state.routes[index].key,
				canPreventDefault: true,
			});

			if (!event.defaultPrevented) {
				navigation.navigate(routeName);
			}
		},
		[navigation, state.routes, indicatorX]
	);

	return (
		<View
			style={[
				styles.tabBar,
				{
					backgroundColor: colors.surfaceContainer,
					height: tabBarHeight,
					paddingBottom: insets.bottom,
				},
			]}
		>
			<View style={styles.tabsContainer}>
				<Animated.View
					style={[
						styles.indicator,
						{ backgroundColor: colors.secondaryContainer },
						animatedIndicatorStyle,
					]}
				/>

				{state.routes.map((route, index) => {
					const tabId = tabOrder[index];
					const config = TAB_CONFIG[tabId];
					const isFocused = state.index === index;
					const IconComponent = config.icon;
					const showNotificationDot = tabId === 'downloads' && hasActiveDownloads;

					return (
						<Pressable
							key={route.key}
							onPress={() => handleTabPress(index, route.name)}
							style={styles.tabButton}
							accessibilityRole="button"
							accessibilityState={isFocused ? { selected: true } : {}}
						>
							<View style={styles.iconContainer}>
								<IconComponent
									size={24}
									color={isFocused ? colors.primary : colors.onSurfaceVariant}
									strokeWidth={isFocused ? 2.5 : 2}
								/>
								{showNotificationDot && (
									<Animated.View
										entering={FadeIn.duration(200)}
										exiting={FadeOut.duration(200)}
										style={[
											styles.notificationDot,
											{ backgroundColor: colors.primary },
										]}
									/>
								)}
							</View>
							<Text
								style={[
									styles.tabLabel,
									{
										color: isFocused ? colors.primary : colors.onSurfaceVariant,
										opacity: isFocused ? 1 : 0.7,
									},
								]}
							>
								{config.label}
							</Text>
						</Pressable>
					);
				})}
			</View>
		</View>
	);
}

const styles = StyleSheet.create({
	tabBar: {
		flexDirection: 'row',
		justifyContent: 'center',
		alignItems: 'center',
		borderTopWidth: 0,
		elevation: 0,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: -1 },
		shadowOpacity: 0.1,
		shadowRadius: 4,
	},
	tabsContainer: {
		flexDirection: 'row',
	},
	indicator: {
		position: 'absolute',
		top: 13,
		left: 0,
		width: INDICATOR_WIDTH,
		height: INDICATOR_HEIGHT,
		borderRadius: 16,
	},
	tabButton: {
		width: TAB_WIDTH,
		alignItems: 'center',
		justifyContent: 'center',
		height: TAB_BAR_HEIGHT,
		gap: 6,
	},
	iconContainer: {
		position: 'relative',
	},
	notificationDot: {
		position: 'absolute',
		top: -2,
		right: -4,
		width: 8,
		height: 8,
		borderRadius: 4,
	},
	tabLabel: {
		fontSize: 12,
		fontWeight: '500',
	},
});
