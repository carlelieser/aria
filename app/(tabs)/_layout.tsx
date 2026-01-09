/**
 * Tab Layout
 *
 * Material 3 bottom navigation with Library, Explore, Downloads, and Settings tabs.
 * Features a sliding animated indicator that transitions between tabs.
 */

import { useEffect, useRef } from 'react';
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
  LibraryIcon,
  CompassIcon,
  DownloadIcon,
  SettingsIcon,
} from 'lucide-react-native';
import { useAppTheme } from '@/lib/theme';
import { useDownloadQueue } from '@/hooks/use-download-queue';
import { useDefaultTab } from '@/src/application/state/settings-store';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';

export const TAB_BAR_HEIGHT = 80;

const TAB_WIDTH = 84;
const INDICATOR_WIDTH = 64;
const INDICATOR_HEIGHT = 32;

const TAB_ICONS = [LibraryIcon, CompassIcon, DownloadIcon, SettingsIcon];
const TAB_LABELS = ['Library', 'Explore', 'Downloads', 'Settings'];
const TAB_ROUTES = ['/', '/explore', '/downloads', '/settings'] as const;
const TAB_ROUTE_MAP: Record<string, (typeof TAB_ROUTES)[number]> = {
  index: '/',
  explore: '/explore',
  downloads: '/downloads',
  settings: '/settings',
};

export default function TabLayout() {
  const defaultTab = useDefaultTab();
  const hasNavigatedRef = useRef(false);

  useEffect(() => {
    if (!hasNavigatedRef.current && defaultTab !== 'index') {
      hasNavigatedRef.current = true;
      const route = TAB_ROUTE_MAP[defaultTab];
      if (route) {
        router.replace(route);
      }
    }
  }, [defaultTab]);

  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={(props) => <CustomTabBar {...props} />}
    >
      <Tabs.Screen name="index" options={{ title: 'Library' }} />
      <Tabs.Screen name="explore" options={{ title: 'Explore' }} />
      <Tabs.Screen name="downloads" options={{ title: 'Downloads' }} />
      <Tabs.Screen name="settings" options={{ title: 'Settings' }} />
    </Tabs>
  );
}

const DOWNLOADS_TAB_INDEX = 2;

function CustomTabBar({ state, navigation }: BottomTabBarProps) {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const { hasActiveDownloads } = useDownloadQueue();
  const tabBarHeight = TAB_BAR_HEIGHT + insets.bottom;

  const indicatorX = useSharedValue(state.index * TAB_WIDTH + (TAB_WIDTH - INDICATOR_WIDTH) / 2);

  const animatedIndicatorStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: indicatorX.value }],
    };
  });

  const handleTabPress = (index: number, routeName: string) => {
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
  };

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
        {/* Sliding indicator */}
        <Animated.View
          style={[
            styles.indicator,
            { backgroundColor: colors.secondaryContainer },
            animatedIndicatorStyle,
          ]}
        />

        {/* Tab buttons */}
        {state.routes.map((route, index) => {
          const isFocused = state.index === index;
          const IconComponent = TAB_ICONS[index];
          const label = TAB_LABELS[index];
          const showNotificationDot = index === DOWNLOADS_TAB_INDEX && hasActiveDownloads;

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
                {label}
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
