import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as SplashScreen from 'expo-splash-screen';

import { PortalHost } from '@rn-primitives/portal';
import { lazyBootstrap } from '@/src/application/bootstrap';
import { FloatingPlayer } from '@/components/floating-player';
import { ToastContainer } from '@/components/ui/toast';
import { AppThemeProvider, useAppTheme } from '@/lib/theme';

// Hide splash immediately - no blocking initialization
SplashScreen.preventAutoHideAsync().then(() => SplashScreen.hideAsync());

// Start lazy initialization in background (non-blocking)
lazyBootstrap();

function AppContent() {
  const { colors, isDark } = useAppTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="player" options={{ headerShown: false }} />
        <Stack.Screen name="plugins" options={{ headerShown: false }} />
        <Stack.Screen name="artist/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="album/[id]" options={{ headerShown: false }} />
        <Stack.Screen
          name="playlist-picker"
          options={{ headerShown: false, presentation: 'modal' }}
        />
      </Stack>
      <FloatingPlayer />
      <ToastContainer />
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <PortalHost />
    </View>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={styles.container}>
      <SafeAreaProvider>
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
});
