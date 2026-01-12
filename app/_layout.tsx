// Crypto polyfill must be imported first, before youtubei.js
import '@/src/lib/crypto-polyfill';
// Track player service must be registered before app renders
import '@/src/lib/track-player-setup';

import React, { useState, useEffect, useCallback } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, StyleSheet } from 'react-native';
import { SafeAreaProvider, initialWindowMetrics } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as SplashScreen from 'expo-splash-screen';

import { PortalHost } from '@rn-primitives/portal';
import { lazyBootstrap, ensureBootstrapped } from '@/src/application/bootstrap';
import { preloadInnertubeClient } from '@/src/plugins/metadata/youtube-music/client';
import { FloatingPlayer } from '@/components/floating-player';
import { TrackOptionsSheet } from '@/components/track-options-menu';
import { ToastContainer } from '@/components/ui/toast';
import { ScanProgressToast } from '@/components/ui/scan-progress-toast';
import { AnimatedSplash } from '@/components/ui/animated-splash';
import { AppThemeProvider, useAppTheme } from '@/lib/theme';
import { ErrorBoundary, useGlobalErrorHandlers } from '@/lib/error-capture';

const MIN_SPLASH_DURATION_MS = 1500;
const PORTAL_Z_INDEX = 9999;

// Hide native splash immediately to show our custom one
SplashScreen.preventAutoHideAsync().then(() => SplashScreen.hideAsync());

// Start lazy initialization in background (non-blocking)
lazyBootstrap();

// Preload innertube client in background so it's ready when needed
preloadInnertubeClient();

function AppContent() {
	const { colors, isDark } = useAppTheme();
	const [isReady, setIsReady] = useState(false);
	const [showSplash, setShowSplash] = useState(true);

	// Install global error handlers
	useGlobalErrorHandlers();

	useEffect(() => {
		const startTime = Date.now();

		ensureBootstrapped().then(() => {
			const elapsed = Date.now() - startTime;
			const remaining = Math.max(0, MIN_SPLASH_DURATION_MS - elapsed);

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
				<Stack.Screen name="plugin/[id]" />
				<Stack.Screen name="library/search" />
				<Stack.Screen name="library/settings" />
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
		<ErrorBoundary>
			<GestureHandlerRootView style={styles.container}>
				<SafeAreaProvider initialMetrics={initialWindowMetrics}>
					<AppThemeProvider>
						<AppContent />
					</AppThemeProvider>
				</SafeAreaProvider>
			</GestureHandlerRootView>
		</ErrorBoundary>
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
		zIndex: PORTAL_Z_INDEX,
	},
});
