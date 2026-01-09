import {DarkTheme, DefaultTheme, ThemeProvider} from '@react-navigation/native';
import {Stack} from 'expo-router';
import {StatusBar} from 'expo-status-bar';
import {View} from 'react-native';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import * as SplashScreen from 'expo-splash-screen';
import 'react-native-reanimated';
import "../global.css";

import {useColorScheme} from '@/hooks/use-color-scheme';
import {PortalHost} from "@rn-primitives/portal";
import {useState, useEffect} from "react";
import {bootstrap} from "@/src/application/bootstrap";
import {getYouTubeMusicProvider} from "@/src/plugins/metadata/youtube-music";
import {expoAudioPlaybackProvider} from "@/src/plugins/playback/expo-av";
import {dashPlaybackProvider} from "@/src/plugins/playback/dash";
import {Text} from "@/components/ui/text";
import {FloatingPlayer} from "@/components/floating-player";
import {ToastContainer} from "@/components/ui/toast";

SplashScreen.preventAutoHideAsync();

// All playback providers - system routes automatically based on URL type
const playbackProviders = [dashPlaybackProvider, expoAudioPlaybackProvider];

export const unstable_settings = {
	anchor: 'index',
};

export default function RootLayout() {
	const colorScheme = useColorScheme();
	const [isInitialized, setIsInitialized] = useState(false);
	const [initError, setInitError] = useState<string | null>(null);

	useEffect(() => {
		async function initializeApp() {
			try {
				console.log('[App] Initializing...');

				// Initialize all playback providers
				for (const provider of playbackProviders) {
					await provider.onInit();
				}

				// Bootstrap the application with providers
				await bootstrap({
					playbackProviders,
					metadataProviders: [getYouTubeMusicProvider()],
				});

				console.log('[App] Initialization complete');
				setIsInitialized(true);
				await SplashScreen.hideAsync();
			} catch (error) {
				console.error('[App] Initialization failed:', error);
				setInitError(error instanceof Error ? error.message : 'Unknown error');
				await SplashScreen.hideAsync();
			}
		}

		initializeApp();
	}, []);

	// Show error screen if initialization failed
	if (initError) {
		return (
			<GestureHandlerRootView style={{flex: 1}}>
				<SafeAreaProvider>
					<ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
						<View className="flex-1 items-center justify-center bg-background">
							<View className="items-center gap-4">
								<Text className="text-destructive">Initialization failed</Text>
								<Text variant="muted">{initError}</Text>
							</View>
						</View>
					</ThemeProvider>
				</SafeAreaProvider>
			</GestureHandlerRootView>
		);
	}

	// Splash screen remains visible until initialized
	if (!isInitialized) {
		return null;
	}

	return (
		<GestureHandlerRootView style={{flex: 1}}>
			<SafeAreaProvider>
				<ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
					<View style={{flex: 1}}>
						<Stack>
							<Stack.Screen name="index" options={{headerShown: false}}/>
							<Stack.Screen name="search" options={{headerShown: false}}/>
							<Stack.Screen name="player" options={{headerShown: false}}/>
							<Stack.Screen name="settings" options={{headerShown: false}}/>
							<Stack.Screen name="plugins" options={{headerShown: false}}/>
							<Stack.Screen name="artist/[id]" options={{headerShown: false}}/>
							<Stack.Screen name="album/[id]" options={{headerShown: false}}/>
							<Stack.Screen name="playlist-picker" options={{headerShown: false, presentation: 'modal'}}/>
						</Stack>
						<FloatingPlayer />
						<ToastContainer />
						<StatusBar style="auto"/>
						<PortalHost/>
					</View>
				</ThemeProvider>
			</SafeAreaProvider>
		</GestureHandlerRootView>
	);
}
