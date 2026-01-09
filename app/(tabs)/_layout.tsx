/**
 * Tab Layout
 *
 * Material 3 bottom navigation with Library, Explore, Downloads, and Settings tabs.
 * Features a sliding animated indicator that transitions between tabs.
 * Tab order is customizable via settings.
 */

import { useEffect, useRef, useCallback, useMemo } from 'react';
import { Tabs, router } from 'expo-router';
import { View, Pressable, StyleSheet, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  FadeIn,
  FadeOut,
} from 'react-native-reanimated';
import {
  MusicIcon,
  CompassIcon,
  DownloadIcon,
  SettingsIcon,
  type LucideIcon,
} from 'lucide-react-native';
import { useAppTheme } from '@/lib/theme';
import { useDownloadQueue } from '@/hooks/use-download-queue';
import {
  useDefaultTab,
  useTabOrder,
  type TabId,
  DEFAULT_TAB_ORDER,
} from '@/src/application/state/settings-store';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';

export const TAB_BAR_HEIGHT = 80;

const TAB_WIDTH = 84;
const INDICATOR_WIDTH = 64;
const INDICATOR_HEIGHT = 32;

interface TabConfig {
  icon: LucideIcon;
  label: string;
  route: string;
}

export const TAB_CONFIG: Record<TabId, TabConfig> = {
  index: { icon: MusicIcon, label: 'Library', route: '/' },
  explore: { icon: CompassIcon, label: 'Explore', route: '/explore' },
  downloads: { icon: DownloadIcon, label: 'Downloads', route: '/downloads' },
  settings: { icon: SettingsIcon, label: 'Settings', route: '/settings' },
};

export default function TabLayout() {
  const defaultTab = useDefaultTab();
  const tabOrder = useTabOrder();
  const hasNavigatedRef = useRef(false);

  // Ensure tab order is valid and contains all tabs
  const validTabOrder = useMemo(() => {
    const validTabs = tabOrder.filter((id) => id in TAB_CONFIG);
    if (validTabs.length !== DEFAULT_TAB_ORDER.length) {
      return DEFAULT_TAB_ORDER;
    }
    return validTabs;
  }, [tabOrder]);

  useEffect(() => {
    if (!hasNavigatedRef.current && defaultTab !== validTabOrder[0]) {
      hasNavigatedRef.current = true;
      const config = TAB_CONFIG[defaultTab];
      if (config) {
        const timer = setTimeout(() => {
          router.replace(config.route as '/' | '/explore' | '/downloads' | '/settings');
        }, 0);
        return () => clearTimeout(timer);
      }
    }
  }, [defaultTab, validTabOrder]);

  return (
    <Tabs
      screenOptions={{ headerShown: false }}
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
  }, [state.index]);

  const animatedIndicatorStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: indicatorX.value }],
    };
  });

  const handleTabPress = useCallback((index: number, routeName: string) => {
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
  }, [navigation, state.routes]);

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
                    style={[styles.notificationDot, { backgroundColor: colors.primary }]}
                  />
                )}
              </View>
              <Text
                style={[
                  styles.tabLabel,
                  { color: isFocused ? colors.primary : colors.onSurfaceVariant },
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
    top: 12,
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
