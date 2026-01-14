import '@/src/lib/crypto-polyfill';
import React, { useState, useEffect, useCallback } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, StyleSheet } from 'react-native';
import { SafeAreaProvider, initialWindowMetrics } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as SplashScreen from 'expo-splash-screen';

import { PortalHost } from '@rn-primitives/portal';
import { lazyBootstrap, ensureBootstrapped } from '@/src/application/bootstrap';
import { appResumeManager } from '@/src/application/services/app-resume-manager';
import { useAppState } from '@/hooks/use-app-state';
import { FloatingPlayer } from '@/components/floating-player';
import { TrackOptionsSheet } from '@/components/track-options-menu';
import { SleepTimerSheet } from '@/components/sleep-timer-sheet';
import { ToastContainer } from '@/components/ui/toast';
import { ScanProgressToast } from '@/components/ui/scan-progress-toast';
import { AnimatedSplash } from '@/components/ui/animated-splash';
import { AppThemeProvider, useAppTheme } from '@/lib/theme';
import { ErrorBoundary, useGlobalErrorHandlers } from '@/lib/error-capture';
import {
	useSleepTimerSheetOpen,
	usePlayerUIStore,
} from '@/src/application/state/player-ui-store';

const PORTAL_Z_INDEX = 9999;

SplashScreen.hide();
lazyBootstrap();

function AppContent() {
	const { colors, isDark } = useAppTheme();
	const [isReady, setIsReady] = useState(false);
	const [showSplash, setShowSplash] = useState(true);
	const sleepTimerSheetOpen = useSleepTimerSheetOpen();
	const closeSleepTimerSheet = usePlayerUIStore((state) => state.closeSleepTimerSheet);

	useGlobalErrorHandlers();

	useAppState({
		onForeground: () => {
			appResumeManager.onResume();
		},
		onBackground: () => {
			appResumeManager.onBackground();
		},
		deferForegroundCallbacks: true,
	});

	useEffect(() => {
		ensureBootstrapped().then(() => {
			setIsReady(true);
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
			<SleepTimerSheet isOpen={sleepTimerSheetOpen} onClose={closeSleepTimerSheet} />
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
