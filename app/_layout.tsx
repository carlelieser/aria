import React, { useState, useEffect, useCallback } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, StyleSheet } from 'react-native';
import { SafeAreaProvider, initialWindowMetrics } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as SplashScreen from 'expo-splash-screen';

import { PortalHost } from '@rn-primitives/portal';
import { lazyBootstrap, ensureBootstrapped } from '@/src/application/bootstrap';
import { FloatingPlayer } from '@/components/floating-player';
import { TrackOptionsSheet } from '@/components/track-options-menu';
import { ToastContainer } from '@/components/ui/toast';
import { ScanProgressToast } from '@/components/ui/scan-progress-toast';
import { AnimatedSplash } from '@/components/ui/animated-splash';
import { AppThemeProvider, useAppTheme } from '@/lib/theme';

const MIN_SPLASH_DURATION = 1500;

// Hide native splash immediately to show our custom one
SplashScreen.preventAutoHideAsync().then(() => SplashScreen.hideAsync());

// Start lazy initialization in background (non-blocking)
lazyBootstrap();

function AppContent() {
	const { colors, isDark } = useAppTheme();
	const [isReady, setIsReady] = useState(false);
	const [showSplash, setShowSplash] = useState(true);

	useEffect(() => {
		const startTime = Date.now();

		ensureBootstrapped().then(() => {
			const elapsed = Date.now() - startTime;
			const remaining = Math.max(0, MIN_SPLASH_DURATION - elapsed);

			setTimeout(() => {
				setIsReady(true);
			}, remaining);
		});
	}, []);

	const handleSplashComplete = useCallback(() => {
		setShowSplash(false);
	}, []);

	return (
		<View style={[styles.container, { backgroundColor: colors.background }]}>
			<Stack
				screenOptions={{
					headerShown: false,
					animation: 'simple_push',
					contentStyle: { backgroundColor: colors.background },
				}}
			>
				<Stack.Screen name="(tabs)" />
				<Stack.Screen name="player" />
				<Stack.Screen name="plugins" />
				<Stack.Screen name="artist/[id]" />
				<Stack.Screen name="album/[id]" />
				<Stack.Screen name="playlist/[id]" />
				<Stack.Screen name="playlist-picker" options={{ presentation: 'modal' }} />
			</Stack>
			<FloatingPlayer />
			<TrackOptionsSheet />
			<ToastContainer />
			<ScanProgressToast />
			<StatusBar style={isDark ? 'light' : 'dark'} />
			<View style={styles.portalHost} pointerEvents="box-none">
				<PortalHost />
			</View>
			{showSplash && (
				<AnimatedSplash
					isReady={isReady}
					onAnimationComplete={handleSplashComplete}
					isDark={isDark}
				/>
			)}
		</View>
	);
}

export default function RootLayout() {
	return (
		<GestureHandlerRootView style={styles.container}>
			<SafeAreaProvider initialMetrics={initialWindowMetrics}>
				<AppThemeProvider>
					<AppContent />
				</AppThemeProvider>
			</SafeAreaProvider>
		</GestureHandlerRootView>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
	},
	portalHost: {
		position: 'absolute',
		top: 0,
		left: 0,
		right: 0,
		bottom: 0,
		zIndex: 9999,
	},
});
