/**
 * FloatingPlayer Component
 *
 * Mini player that appears at the bottom of the screen when navigating away from player.
 * Uses M3 Surface elevation and theming.
 */

import { View, Pressable, ActivityIndicator, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
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
import { IconButton, Text } from 'react-native-paper';

import { FloatingProgressBar } from './floating-progress-bar';

import { Play, Pause } from 'lucide-react-native';
import { usePlayer } from '@/hooks/use-player';
import { useCurrentTrack, usePlaybackStatus } from '@/src/application/state/player-store';
import { getArtistNames } from '@/src/domain/entities/track';
import { getLargestArtwork } from '@/src/domain/value-objects/artwork';
import { useAppTheme, M3Shapes } from '@/lib/theme';
import { TAB_BAR_HEIGHT } from '@/app/(tabs)/_layout';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const FLOATING_PLAYER_HEIGHT = 64;
const TAB_ROUTES = ['/', '/explore', '/downloads', '/settings'];

export function FloatingPlayer() {
	const pathname = usePathname();
	const insets = useSafeAreaInsets();
	const currentTrack = useCurrentTrack();
	const status = usePlaybackStatus();
	const { togglePlayPause, isLoading, isBuffering } = usePlayer();
	const { colors } = useAppTheme();

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

	const animatedStyle = useAnimatedStyle(() => {
		return {
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
		};
	});

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

	const containerStyle = useMemo(
		() => [
			styles.container,
			{
				bottom: bottomOffset,
				backgroundColor: colors.surfaceContainerHigh,
			},
			animatedStyle,
		],
		[bottomOffset, colors.surfaceContainerHigh, animatedStyle]
	);

	const playPauseIcon = useCallback(
		({ size, color }: { size: number; color: string }) =>
			isPlaying ? (
				<Pause size={size} color={color} fill={color} />
			) : (
				<Play size={size} color={color} fill={color} />
			),
		[isPlaying]
	);

	if (!isVisible && !shouldShow) {
		return <View style={styles.hidden} />;
	}

	return (
		<AnimatedPressable
			key="floating-player"
			onPress={handlePress}
			pointerEvents={shouldShow ? 'auto' : 'none'}
			style={containerStyle}
		>
			{/* Progress bar at top */}
			<View style={styles.progressContainer}>
				<FloatingProgressBar />
			</View>

			{/* Content */}
			<View style={styles.content}>
				{/* Artwork */}
				<View style={styles.artworkContainer}>
					<Image
						source={{ uri: artworkUrl }}
						style={styles.artwork}
						contentFit="cover"
						transition={200}
						cachePolicy="memory-disk"
						recyclingKey={currentTrack?.id.value}
					/>
					{showLoadingIndicator && (
						<View style={styles.loadingOverlay}>
							<ActivityIndicator size="small" color="white" />
						</View>
					)}
				</View>

				{/* Track info */}
				<View style={styles.trackInfo}>
					<Text
						variant="titleSmall"
						numberOfLines={1}
						style={{ color: colors.onSurface }}
					>
						{currentTrack?.title}
					</Text>
					<Text
						variant="bodySmall"
						numberOfLines={1}
						style={{ color: colors.onSurfaceVariant }}
					>
						{artistNames}
					</Text>
				</View>

				{/* Controls */}
				<View style={styles.controls}>
					<IconButton
						icon={playPauseIcon}
						size={24}
						onPress={handlePlayPause}
						disabled={isLoading}
						iconColor={colors.onSurface}
					/>
				</View>
			</View>
		</AnimatedPressable>
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
		elevation: 3,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.1,
		shadowRadius: 4,
	},
	progressContainer: {
		position: 'absolute',
		top: 0,
		left: 0,
		right: 0,
		zIndex: 10,
	},
	content: {
		flex: 1,
		flexDirection: 'row',
		alignItems: 'center',
		paddingHorizontal: 12,
		paddingTop: 4,
	},
	artworkContainer: {
		position: 'relative',
	},
	artwork: {
		width: 48,
		height: 48,
		borderRadius: M3Shapes.small,
	},
	loadingOverlay: {
		position: 'absolute',
		top: 0,
		left: 0,
		right: 0,
		bottom: 0,
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: 'rgba(0,0,0,0.3)',
		borderRadius: M3Shapes.small,
	},
	trackInfo: {
		flex: 1,
		marginHorizontal: 12,
		justifyContent: 'center',
	},
	controls: {
		flexDirection: 'row',
		alignItems: 'center',
	},
});
