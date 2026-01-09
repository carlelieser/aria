import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, StyleSheet, useColorScheme } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as SplashScreen from 'expo-splash-screen';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
  runOnJS,
  interpolate,
  SharedValue,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';

import { PortalHost } from '@rn-primitives/portal';
import { useState, useEffect, useCallback } from 'react';
import { bootstrap } from '@/src/application/bootstrap';
import { getYouTubeMusicProvider } from '@/src/plugins/metadata/youtube-music';
import { expoAudioPlaybackProvider } from '@/src/plugins/playback/expo-av';
import { dashPlaybackProvider } from '@/src/plugins/playback/dash';
import { Text } from 'react-native-paper';
import { FloatingPlayer } from '@/components/floating-player';
import { ToastContainer } from '@/components/ui/toast';
import { getLogger } from '@/src/shared/services/logger';
import { AppThemeProvider, useAppTheme } from '@/lib/theme';
import SplashIcon from '@/assets/icon.svg';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const logger = getLogger('App');

SplashScreen.preventAutoHideAsync();

const playbackProviders = [dashPlaybackProvider, expoAudioPlaybackProvider];

const SPLASH_BACKGROUND_LIGHT = '#FFFBFE';
const SPLASH_BACKGROUND_DARK = '#1C1B1F';
const ICON_ACCENT = '#00233a';

const ICON_SIZE = 200;
const SVG_SIZE = 240;
const CENTER = SVG_SIZE / 2;

const CIRCLE_CONFIG = [
  { radius: 108, strokeWidth: 8, delay: 0 },
  { radius: 96, strokeWidth: 6, delay: 80 },
  { radius: 86, strokeWidth: 4, delay: 160 },
];

const DRAW_DURATION = 700;
const HOLD_DURATION = 200;
const FADE_DURATION = 300;

interface AnimatedSplashProps {
  isReady: boolean;
  onAnimationComplete: () => void;
}

interface AnimatedRingProps {
  radius: number;
  strokeWidth: number;
  progress: SharedValue<number>;
  color: string;
}

function AnimatedRing({
  radius,
  strokeWidth,
  progress,
  color,
}: AnimatedRingProps) {
  const circumference = 2 * Math.PI * radius;

  const animatedProps = useAnimatedProps(() => {
    const dashOffset = interpolate(
      progress.value,
      [0, 1],
      [circumference, 0]
    );
    return {
      strokeDashoffset: dashOffset,
    };
  });

  return (
    <AnimatedCircle
      cx={CENTER}
      cy={CENTER}
      r={radius}
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeDasharray={`${circumference}`}
      fill="none"
      animatedProps={animatedProps}
      rotation={-90}
      origin={`${CENTER}, ${CENTER}`}
    />
  );
}

function AnimatedSplash({ isReady, onAnimationComplete }: AnimatedSplashProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const bgColor = isDark ? SPLASH_BACKGROUND_DARK : SPLASH_BACKGROUND_LIGHT;

  const ring1Progress = useSharedValue(0);
  const ring2Progress = useSharedValue(0);
  const ring3Progress = useSharedValue(0);
  const opacity = useSharedValue(1);
  const scale = useSharedValue(1);

  useEffect(() => {
    if (isReady) {
      SplashScreen.hideAsync();

      const ringProgress = [ring1Progress, ring2Progress, ring3Progress];

      ringProgress.forEach((progress, index) => {
        progress.value = withDelay(
          CIRCLE_CONFIG[index].delay,
          withTiming(1, {
            duration: DRAW_DURATION,
            easing: Easing.out(Easing.cubic),
          })
        );
      });

      const totalDrawTime = DRAW_DURATION + CIRCLE_CONFIG[2].delay;

      scale.value = withDelay(
        totalDrawTime + HOLD_DURATION,
        withTiming(1.1, {
          duration: FADE_DURATION,
          easing: Easing.out(Easing.cubic),
        })
      );

      opacity.value = withDelay(
        totalDrawTime + HOLD_DURATION,
        withTiming(
          0,
          {
            duration: FADE_DURATION,
            easing: Easing.out(Easing.cubic),
          },
          (finished) => {
            if (finished) {
              runOnJS(onAnimationComplete)();
            }
          }
        )
      );
    }
  }, [isReady, ring1Progress, ring2Progress, ring3Progress, opacity, scale, onAnimationComplete]);

  const containerStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  return (
    <View style={[styles.splashContainer, { backgroundColor: bgColor }]}>
      <Animated.View style={[styles.splashContent, containerStyle]}>
        <View style={styles.iconWrapper}>
          <SplashIcon width={ICON_SIZE} height={ICON_SIZE} />
        </View>
        <View style={styles.ringsContainer}>
          <Svg width={SVG_SIZE} height={SVG_SIZE}>
            <AnimatedRing
              radius={CIRCLE_CONFIG[0].radius}
              strokeWidth={CIRCLE_CONFIG[0].strokeWidth}
              progress={ring1Progress}
              color={ICON_ACCENT}
            />
            <AnimatedRing
              radius={CIRCLE_CONFIG[1].radius}
              strokeWidth={CIRCLE_CONFIG[1].strokeWidth}
              progress={ring2Progress}
              color={ICON_ACCENT}
            />
            <AnimatedRing
              radius={CIRCLE_CONFIG[2].radius}
              strokeWidth={CIRCLE_CONFIG[2].strokeWidth}
              progress={ring3Progress}
              color={ICON_ACCENT}
            />
          </Svg>
        </View>
      </Animated.View>
    </View>
  );
}

export const unstable_settings = {
  anchor: 'index',
};

function AppContent() {
  const { colors, isDark } = useAppTheme();
  const [isInitialized, setIsInitialized] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);
  const [showSplash, setShowSplash] = useState(true);

  const handleSplashAnimationComplete = useCallback(() => {
    setShowSplash(false);
  }, []);

  useEffect(() => {
    async function initializeApp() {
      try {
        logger.info('Initializing...');

        for (const provider of playbackProviders) {
          await provider.onInit();
        }

        await bootstrap({
          playbackProviders,
          metadataProviders: [getYouTubeMusicProvider()],
        });

        logger.info('Initialization complete');
        setIsInitialized(true);
      } catch (error) {
        logger.error(
          'Initialization failed:',
          error instanceof Error ? error : undefined
        );
        setInitError(error instanceof Error ? error.message : 'Unknown error');
        setIsInitialized(true);
      }
    }

    initializeApp();
  }, []);

  if (initError && !showSplash) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <View style={styles.errorContainer}>
          <Text variant="titleMedium" style={{ color: colors.error }}>
            Initialization failed
          </Text>
          <Text
            variant="bodyMedium"
            style={{ color: colors.onSurfaceVariant, marginTop: 8 }}
          >
            {initError}
          </Text>
        </View>
        {showSplash && (
          <AnimatedSplash
            isReady={isInitialized}
            onAnimationComplete={handleSplashAnimationComplete}
          />
        )}
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {isInitialized && !initError && (
        <>
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
        </>
      )}
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <PortalHost />
      {showSplash && (
        <AnimatedSplash
          isReady={isInitialized}
          onAnimationComplete={handleSplashAnimationComplete}
        />
      )}
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
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorContainer: {
    alignItems: 'center',
    gap: 4,
  },
  splashContainer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  splashContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapper: {
    width: ICON_SIZE,
    height: ICON_SIZE,
    borderRadius: ICON_SIZE / 2,
    overflow: 'hidden',
  },
  ringsContainer: {
    position: 'absolute',
    width: SVG_SIZE,
    height: SVG_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
