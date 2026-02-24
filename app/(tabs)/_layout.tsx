import { useState, useEffect, useCallback, useMemo, memo } from 'react';
import { Tabs, router } from 'expo-router';
import { View, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { Text, IconButton } from 'react-native-paper';
import { SettingsIcon } from 'lucide-react-native';
import { ProfileAvatarButton } from '@/src/components/ui/profile-avatar-button';
import { useAppTheme, resolveDisplayFont } from '@/lib/theme';
import { useActiveDownloadsCount } from '@/src/application/state/download-store';
import {
	useTabOrder,
	useEnabledTabs,
	type TabId,
	DEFAULT_TAB_ORDER,
} from '@/src/application/state/settings-store';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { TAB_CONFIG, TAB_BAR_HEIGHT } from '@/lib/tab-config';
import { LottieTabIcon } from '@/src/components/ui/lottie-tab-icon';
import { StaticTabIcon } from '@/src/components/ui/static-tab-icon';
import { Icon } from '@/src/components/ui/icon';

const TAB_WIDTH = 68;
const TAB_GAP = 12;
const INDICATOR_WIDTH = 64;
const INDICATOR_HEIGHT = 32;
const INDICATOR_TOP = 11;

const TAB_SPRING_CONFIG = { damping: 20, stiffness: 200, mass: 0.5 };

// Lightweight pub/sub so the tab bar can notify the header of active tab
// changes without re-rendering the parent TabLayout (which would recreate
// Tabs.Screen children and trigger full screen unmount/remount).
type ActiveTabListener = (tabId: TabId) => void;
const activeTabListeners = new Set<ActiveTabListener>();

function emitActiveTab(tabId: TabId): void {
	activeTabListeners.forEach((fn) => fn(tabId));
}

function useActiveTabListener(initial: TabId): TabId {
	const [tabId, setTabId] = useState<TabId>(initial);

	useEffect(() => {
		activeTabListeners.add(setTabId);
		return () => {
			activeTabListeners.delete(setTabId);
		};
	}, []);

	return tabId;
}

export default function TabLayout() {
	const tabOrder = useTabOrder();
	const enabledTabs = useEnabledTabs();

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

	const { colors } = useAppTheme();

	const screenOptions = useMemo(
		() => ({
			headerShown: false,
			animation: 'shift' as const,
			lazy: false,
			freezeOnBlur: true,
			sceneStyle: {
				borderTopLeftRadius: 48,
				borderTopRightRadius: 48,
				overflow: 'hidden' as const,
				backgroundColor: colors.background,
			},
		}),
		[colors.background]
	);

	// Stabilize the tabBar render callback so the navigator never receives a
	// new function reference on re-render.
	const renderTabBar = useCallback(
		(props: BottomTabBarProps) => (
			<CustomTabBar {...props} tabOrder={validTabOrder} onActiveTabChange={emitActiveTab} />
		),
		[validTabOrder]
	);

	return (
		<View style={styles.layoutRoot}>
			<TabHeader initialTabId={validTabOrder[0]} />
			<Tabs screenOptions={screenOptions} tabBar={renderTabBar}>
				<Tabs.Screen name={'index'} options={{ href: null }} />
				{validTabOrder.map((tabId) => {
					const config = TAB_CONFIG[tabId];
					if (!config) return null;
					return <Tabs.Screen key={tabId} name={tabId} options={config} />;
				})}
			</Tabs>
		</View>
	);
}

function TabHeader({ initialTabId }: { readonly initialTabId: TabId }) {
	const currentTabId = useActiveTabListener(initialTabId);
	const { colors } = useAppTheme();
	const insets = useSafeAreaInsets();
	const title = TAB_CONFIG[currentTabId]?.title ?? '';
	return (
		<View
			style={[
				styles.tabHeader,
				{ paddingTop: insets.top, backgroundColor: colors.background },
			]}
		>
			<IconButton
				icon={() => <Icon as={SettingsIcon} size={22} color={colors.onSurfaceVariant} />}
				onPress={() => router.push('/settings')}
				accessibilityLabel={'Settings'}
			/>
			<Text
				variant={'headlineMedium'}
				style={{ fontFamily: resolveDisplayFont('700'), color: colors.onSurface }}
			>
				{title}
			</Text>
			<ProfileAvatarButton />
		</View>
	);
}

interface CustomTabBarProps extends BottomTabBarProps {
	readonly tabOrder: TabId[];
	readonly onActiveTabChange: (tabId: TabId) => void;
}

function CustomTabBar({ state, navigation, tabOrder, onActiveTabChange }: CustomTabBarProps) {
	const { colors } = useAppTheme();
	const insets = useSafeAreaInsets();
	const activeDownloadsCount = useActiveDownloadsCount();
	const tabBarHeight = TAB_BAR_HEIGHT + insets.bottom;

	const currentRouteName = state.routes[state.index]?.name as TabId;
	const visualIndex = tabOrder.indexOf(currentRouteName);
	const initialX =
		Math.max(0, visualIndex) * (TAB_WIDTH + TAB_GAP) + (TAB_WIDTH - INDICATOR_WIDTH) / 2;

	const indicatorX = useSharedValue(initialX);

	useEffect(() => {
		onActiveTabChange(currentRouteName);
		const newVisualIndex = tabOrder.indexOf(currentRouteName);
		if (newVisualIndex >= 0) {
			const newX = newVisualIndex * (TAB_WIDTH + TAB_GAP) + (TAB_WIDTH - INDICATOR_WIDTH) / 2;
			indicatorX.value = withSpring(newX, {
				damping: 25,
				stiffness: 180,
				mass: 0.5,
			});
		}
	}, [currentRouteName, tabOrder, indicatorX, onActiveTabChange]);

	const animatedIndicatorStyle = useAnimatedStyle(() => {
		return {
			transform: [{ translateX: indicatorX.value }],
		};
	});

	const handleTabPress = useCallback(
		(visualIdx: number, routeIndex: number, routeName: string) => {
			const newX = visualIdx * (TAB_WIDTH + TAB_GAP) + (TAB_WIDTH - INDICATOR_WIDTH) / 2;
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
						if (!config) return null;
						const route = state.routes.find((r) => r.name === tabId);
						if (!route) return null;
						const routeIndex = state.routes.indexOf(route);
						const isFocused = state.index === routeIndex;
						const isDownloadsTab = tabId === 'downloads';
						const downloadBadgeCount = isDownloadsTab
							? activeDownloadsCount || undefined
							: undefined;

						return (
							<Pressable
								key={tabId}
								onPress={() => handleTabPress(visualIdx, routeIndex, tabId)}
								style={styles.tabButton}
								accessibilityRole={'tab'}
								accessibilityLabel={config.title}
								accessibilityState={{ selected: isFocused }}
							>
								{config.lottieSource ? (
									<LottieTabIcon
										source={config.lottieSource}
										isFocused={isFocused}
										focusedColor={colors.primary}
										inactiveColor={colors.onSurfaceVariant}
										badgeCount={downloadBadgeCount}
									/>
								) : (
									<StaticTabIcon
										icon={config.icon}
										isFocused={isFocused}
										focusedColor={colors.primary}
										inactiveColor={colors.onSurfaceVariant}
									/>
								)}
								<TabLabel
									label={config.title ?? ''}
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
	layoutRoot: {
		flex: 1,
	},
	tabHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingHorizontal: 4,
		paddingBottom: 4,
	},
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
