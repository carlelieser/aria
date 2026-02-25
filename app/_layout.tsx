import '@/lib/crypto-polyfill';
import React, { useState, useEffect, useCallback } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, StyleSheet } from 'react-native';
import { SafeAreaProvider, initialWindowMetrics } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';

import { PortalHost } from '@rn-primitives/portal';
import { lazyBootstrap, ensureBootstrapped } from '@/src/application/bootstrap';
import { appResumeManager } from '@/src/application/services/app-resume-manager';
import { useAppState } from '@/src/hooks/use-app-state';
import { FloatingPlayer } from '@/src/components/floating-player';
import { TrackOptionsSheet } from '@/src/components/track-options-menu';
import { SleepTimerSheet } from '@/src/components/player/sleep-timer-sheet';
import { QueueSheet } from '@/src/components/player/queue-sheet';
import { ToastContainer } from '@/src/components/ui/toast';
import { ScanProgressToast } from '@/src/components/ui/scan-progress-toast';
import { ImportProgressToast } from '@/src/components/ui/import-progress-toast';
import { AnimatedSplash } from '@/src/components/ui/animated-splash';
import { AppThemeProvider, useAppTheme } from '@/lib/theme';
import { ErrorBoundary, useGlobalErrorHandlers } from '@/lib/error-capture';
import {
	useSleepTimerSheetOpen,
	useQueueSheetOpen,
	usePlayerUIStore,
} from '@/src/application/state/player-ui-store';
import { enableFreeze } from 'react-native-screens';

const PORTAL_Z_INDEX = 9999;

SplashScreen.hide();
lazyBootstrap();
enableFreeze(true);

function AppContent() {
	const { colors, isDark } = useAppTheme();
	const [isReady, setIsReady] = useState(false);
	const [showSplash, setShowSplash] = useState(true);
	const sleepTimerSheetOpen = useSleepTimerSheetOpen();
	const closeSleepTimerSheet = usePlayerUIStore((state) => state.closeSleepTimerSheet);
	const queueSheetOpen = useQueueSheetOpen();
	const closeQueueSheet = usePlayerUIStore((state) => state.closeQueueSheet);

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
		<View style={[StyleSheet.absoluteFill, { backgroundColor: colors.background }]}>
			<Stack
				screenOptions={{
					headerShown: false,
					animation: 'simple_push',
					contentStyle: { backgroundColor: colors.background },
				}}
			>
				<Stack.Screen name={'(tabs)'} />
				<Stack.Screen
					name={'player'}
					options={{
						animation: 'fade_from_bottom',
					}}
				/>
				<Stack.Screen name={'plugins'} />
				<Stack.Screen name={'plugin/[id]'} />
				<Stack.Screen name={'library/settings'} />
				<Stack.Screen name={'artist/[id]'} />
				<Stack.Screen name={'album/[id]'} />
				<Stack.Screen name={'playlist/[id]'} />
				<Stack.Screen name={'remote-playlist/[id]'} />
				<Stack.Screen name={'profile'} />
				<Stack.Screen name={'settings'} options={{ presentation: 'modal' }} />
				<Stack.Screen name={'add-to-playlist'} options={{ presentation: 'modal' }} />
			</Stack>
			<FloatingPlayer />
			<QueueSheet isOpen={queueSheetOpen} onClose={closeQueueSheet} />
			<SleepTimerSheet isOpen={sleepTimerSheetOpen} onClose={closeSleepTimerSheet} />
			<TrackOptionsSheet />
			<ToastContainer />
			<ScanProgressToast />
			<ImportProgressToast />
			<StatusBar style={isDark ? 'light' : 'dark'} />
			<View style={styles.portalHost} pointerEvents={'box-none'}>
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
	const [fontsLoaded] = useFonts({
		'GoogleSans-Regular': require('@/assets/fonts/GoogleSans-Regular.ttf'),
		'GoogleSans-Medium': require('@/assets/fonts/GoogleSans-Medium.ttf'),
		'GoogleSans-SemiBold': require('@/assets/fonts/GoogleSans-SemiBold.ttf'),
		'GoogleSans-Bold': require('@/assets/fonts/GoogleSans-Bold.ttf'),
		'GoogleSans-Italic': require('@/assets/fonts/GoogleSans-Italic.ttf'),
		'Oswald-Regular': require('@/assets/fonts/Oswald-Regular.ttf'),
		'Oswald-Medium': require('@/assets/fonts/Oswald-Medium.ttf'),
		'Oswald-SemiBold': require('@/assets/fonts/Oswald-SemiBold.ttf'),
		'Oswald-Bold': require('@/assets/fonts/Oswald-Bold.ttf'),
	});

	if (!fontsLoaded) {
		return null;
	}

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
		...StyleSheet.absoluteFillObject,
		zIndex: PORTAL_Z_INDEX,
	},
});
