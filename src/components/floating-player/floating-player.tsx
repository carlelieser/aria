/**
 * FloatingPlayer Component
 *
 * Mini player that appears at the bottom of the screen when navigating away from player.
 * Uses M3 Surface elevation and theming.
 */

import { View, Pressable, StyleSheet } from 'react-native';
import { router, usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
	useAnimatedStyle,
	withTiming,
	interpolate,
	Extrapolation,
	useSharedValue,
	runOnJS,
} from 'react-native-reanimated';
import { useEffect, useState, useMemo, useCallback } from 'react';
import { Surface } from 'react-native-paper';

import { FloatingProgressBar } from './floating-progress-bar';
import { PlayerContent } from './player-content';

import { usePlayer } from '@/src/hooks/use-player';
import { useCurrentTrack, usePlaybackStatus } from '@/src/application/state/player-store';
import { getArtistNames } from '@/src/domain/entities/track';
import { getLargestArtwork } from '@/src/domain/value-objects/artwork';
import { M3Shapes } from '@/lib/theme';
import { TAB_BAR_HEIGHT, TAB_ROUTES } from '@/lib/tab-config';
import { FLOATING_PLAYER_HEIGHT } from '@shared/constants/layout';

const AnimatedSurface = Animated.createAnimatedComponent(Surface);

export { FLOATING_PLAYER_HEIGHT };

export function FloatingPlayer() {
	const pathname = usePathname();
	const insets = useSafeAreaInsets();
	const currentTrack = useCurrentTrack();
	const status = usePlaybackStatus();
	const { togglePlayPause, skipToNext, isLoading, isBuffering } = usePlayer();
	const shouldShow = pathname !== '/player' && currentTrack !== null;
	const isTabRoute = TAB_ROUTES.includes(pathname);
	const bottomOffset = isTabRoute ? TAB_BAR_HEIGHT + insets.bottom + 8 : insets.bottom + 8;

	const visibility = useSharedValue(shouldShow ? 1 : 0);
	const [isVisible, setIsVisible] = useState(shouldShow);

	useEffect(() => {
		if (shouldShow) {
			setIsVisible(true);
			visibility.value = withTiming(1, { duration: 300 });
		} else {
			visibility.value = withTiming(0, { duration: 200 }, (finished) => {
				if (finished) {
					runOnJS(setIsVisible)(false);
				}
			});
		}
	}, [shouldShow, visibility]);

	const animatedStyle = useAnimatedStyle(() => ({
		opacity: visibility.value,
		transform: [
			{
				translateY: interpolate(
					visibility.value,
					[0, 1],
					[100, 0],
					Extrapolation.CLAMP
				),
			},
		],
	}));

	const artwork = currentTrack ? getLargestArtwork(currentTrack.artwork) : null;
	const artworkUrl = artwork?.url;
	const artistNames = currentTrack ? getArtistNames(currentTrack) : '';
	const isPlaying = status === 'playing';
	const showLoadingIndicator = isLoading || isBuffering;

	const handlePress = useCallback(() => {
		router.push('/player');
	}, []);

	const handlePlayPause = useCallback(() => {
		togglePlayPause();
	}, [togglePlayPause]);

	const handleSkipNext = useCallback(() => {
		skipToNext();
	}, [skipToNext]);

	const containerStyle = useMemo(
		() => [styles.container, { bottom: bottomOffset }, animatedStyle],
		[bottomOffset, animatedStyle]
	);

	if (!isVisible && !shouldShow) {
		return <View style={styles.hidden} />;
	}

	return (
		<AnimatedSurface
			key={'floating-player'}
			elevation={3}
			mode={'flat'}
			style={containerStyle}
			pointerEvents={shouldShow ? 'auto' : 'none'}
		>
			<Pressable onPress={handlePress} style={styles.pressable}>
				<View style={styles.progressContainer}>
					<FloatingProgressBar />
				</View>

				<PlayerContent
					artworkUrl={artworkUrl}
					trackId={currentTrack?.id.value}
					title={currentTrack?.title}
					artistNames={artistNames}
					isPlaying={isPlaying}
					showLoadingIndicator={showLoadingIndicator}
					isLoading={isLoading}
					onPlayPause={handlePlayPause}
					onSkipNext={handleSkipNext}
				/>
			</Pressable>
		</AnimatedSurface>
	);
}

const styles = StyleSheet.create({
	hidden: {
		position: 'absolute',
		width: 0,
		height: 0,
	},
	container: {
		position: 'absolute',
		left: 16,
		right: 16,
		height: FLOATING_PLAYER_HEIGHT,
		borderRadius: M3Shapes.large,
		overflow: 'hidden',
	},
	pressable: {
		flex: 1,
	},
	progressContainer: {
		position: 'absolute',
		top: 0,
		left: 0,
		right: 0,
		zIndex: 10,
	},
});
