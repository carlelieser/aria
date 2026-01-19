import { useEffect, useRef, useCallback, useMemo, useState, memo } from 'react';
import { Tabs, router } from 'expo-router';
import { View, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
	useAnimatedStyle,
	useSharedValue,
	withSpring,
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
import { LottieTabIcon } from '@/components/ui/lottie-tab-icon';

const TAB_WIDTH = 84;
const TAB_GAP = 12;
const INDICATOR_WIDTH = 64;
const INDICATOR_HEIGHT = 32;
const INDICATOR_TOP = 11;

const TAB_SPRING_CONFIG = { damping: 20, stiffness: 200, mass: 0.5 };

export default function TabLayout() {
	const defaultTab = useDefaultTab();
	const tabOrder = useTabOrder();
	const enabledTabs = useEnabledTabs();
	const hasNavigatedRef = useRef(false);
	const [isHydrated, setIsHydrated] = useState(useSettingsStore.persist.hasHydrated());
	const [isLayoutReady, setIsLayoutReady] = useState(false);

	useEffect(() => {
		if (useSettingsStore.persist.hasHydrated()) {
			setIsHydrated(true);
			return;
		}

		const unsubscribe = useSettingsStore.persist.onFinishHydration(() => {
			const timeoutId = setTimeout(() => {
				setIsHydrated(true);
			}, 0);
			return () => clearTimeout(timeoutId);
		});

		return unsubscribe;
	}, []);

	useEffect(() => {
		const timeoutId = requestAnimationFrame(() => {
			setIsLayoutReady(true);
		});
		return () => cancelAnimationFrame(timeoutId);
	}, []);

	const validTabOrder = useMemo(() => {
		const safeTabOrder =
			Array.isArray(tabOrder) && tabOrder.length > 0 ? tabOrder : DEFAULT_TAB_ORDER;
		const safeEnabledTabs =
			Array.isArray(enabledTabs) && enabledTabs.length > 0 ? enabledTabs : DEFAULT_TAB_ORDER;

		const validTabs = safeTabOrder.filter((id) => id in TAB_CONFIG);
		if (validTabs.length !== DEFAULT_TAB_ORDER.length) {
			const filtered = DEFAULT_TAB_ORDER.filter((id) => safeEnabledTabs.includes(id));
			return filtered.length > 0 ? filtered : DEFAULT_TAB_ORDER;
		}
		const filtered = validTabs.filter((id) => safeEnabledTabs.includes(id));
		return filtered.length > 0 ? filtered : DEFAULT_TAB_ORDER;
	}, [tabOrder, enabledTabs]);

	useEffect(() => {
		if (!isHydrated || !isLayoutReady || hasNavigatedRef.current) return;

		if (defaultTab !== validTabOrder[0]) {
			hasNavigatedRef.current = true;
			const targetTab = enabledTabs.includes(defaultTab) ? defaultTab : validTabOrder[0];
			const config = TAB_CONFIG[targetTab];
			if (config) {
				const timeoutId = setTimeout(() => {
					router.replace(config.route as '/' | '/downloads' | '/settings');
				}, 50);
				return () => clearTimeout(timeoutId);
			}
		}
	}, [isHydrated, isLayoutReady, defaultTab, validTabOrder, enabledTabs]);

	const screenOptions = useMemo(
		() => ({
			headerShown: false,
			animation: 'shift' as const,
			lazy: false,
			freezeOnBlur: false,
		}),
		[]
	);

	return (
		<Tabs
			screenOptions={screenOptions}
			tabBar={(props) => <CustomTabBar {...props} tabOrder={validTabOrder} />}
		>
			{validTabOrder.map((tabId) => {
				const config = TAB_CONFIG[tabId];
				if (!config) return null;

				return (
					<Tabs.Screen
						key={tabId}
						name={tabId}
						options={{
							title: config.label,
							href: config.route as '/' | '/downloads' | '/settings',
						}}
					/>
				);
			})}
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

	const currentRouteName = state.routes[state.index]?.name as TabId;
	const visualIndex = tabOrder.indexOf(currentRouteName);
	const initialX =
		Math.max(0, visualIndex) * (TAB_WIDTH + TAB_GAP) + (TAB_WIDTH - INDICATOR_WIDTH) / 2;

	const indicatorX = useSharedValue(initialX);

	useEffect(() => {
		const newVisualIndex = tabOrder.indexOf(currentRouteName);
		if (newVisualIndex >= 0) {
			const newX =
				newVisualIndex * (TAB_WIDTH + TAB_GAP) + (TAB_WIDTH - INDICATOR_WIDTH) / 2;
			indicatorX.value = withSpring(newX, {
				damping: 25,
				stiffness: 180,
				mass: 0.5,
			});
		}
	}, [currentRouteName, tabOrder, indicatorX]);

	const animatedIndicatorStyle = useAnimatedStyle(() => {
		return {
			transform: [{ translateX: indicatorX.value }],
		};
	});

	const handleTabPress = useCallback(
		(visualIdx: number, routeIndex: number, routeName: string) => {
			const newX =
				visualIdx * (TAB_WIDTH + TAB_GAP) + (TAB_WIDTH - INDICATOR_WIDTH) / 2;
			indicatorX.value = withSpring(newX, {
				damping: 25,
				stiffness: 180,
				mass: 0.5,
			});

			const event = navigation.emit({
				type: 'tabPress',
				target: state.routes[routeIndex].key,
				canPreventDefault: true,
			});

			if (!event.defaultPrevented) {
				navigation.navigate(routeName);
			}
		},
		[navigation, state.routes, indicatorX]
	);

	return (
		<View style={styles.tabBarContainer}>
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
							{ backgroundColor: colors.secondaryContainer, top: INDICATOR_TOP },
							animatedIndicatorStyle,
						]}
					/>

					{tabOrder.map((tabId, visualIdx) => {
						const config = TAB_CONFIG[tabId];
						if (!config?.lottieSource) return null;
						const route = state.routes.find((r) => r.name === tabId);
						if (!route) return null;
						const routeIndex = state.routes.indexOf(route);
						const isFocused = state.index === routeIndex;
						const showNotificationDot = tabId === 'downloads' && hasActiveDownloads;

						return (
							<Pressable
								key={tabId}
								onPress={() => handleTabPress(visualIdx, routeIndex, tabId)}
								style={styles.tabButton}
								accessibilityRole="tab"
								accessibilityLabel={config.label}
								accessibilityState={{ selected: isFocused }}
							>
								<LottieTabIcon
									source={config.lottieSource}
									isFocused={isFocused}
									focusedColor={colors.primary}
									inactiveColor={colors.onSurfaceVariant}
									showNotificationDot={showNotificationDot}
								/>
								<TabLabel
									label={config.label}
									isFocused={isFocused}
									color={colors.primary}
								/>
							</Pressable>
						);
					})}
				</View>
			</View>
		</View>
	);
}

interface TabLabelProps {
	label: string;
	isFocused: boolean;
	color: string;
}

const TabLabel = memo(function TabLabel({ label, isFocused, color }: TabLabelProps) {
	const opacity = useSharedValue(isFocused ? 1 : 0);
	const translateY = useSharedValue(isFocused ? 0 : 4);

	useEffect(() => {
		opacity.value = withSpring(isFocused ? 1 : 0, TAB_SPRING_CONFIG);
		translateY.value = withSpring(isFocused ? 0 : 4, TAB_SPRING_CONFIG);
	}, [isFocused, opacity, translateY]);

	const animatedStyle = useAnimatedStyle(() => ({
		opacity: opacity.value,
		transform: [{ translateY: translateY.value }],
	}));

	return (
		<Animated.Text style={[styles.tabLabel, { color }, animatedStyle]}>{label}</Animated.Text>
	);
});

const styles = StyleSheet.create({
	tabBarContainer: {
		position: 'relative',
	},
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
		gap: TAB_GAP,
	},
	indicator: {
		position: 'absolute',
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
	tabLabel: {
		fontSize: 12,
		fontWeight: '500',
	},
});
