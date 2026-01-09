import { View, Pressable, ActivityIndicator } from 'react-native';
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
import { useEffect, useState } from 'react';

import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { FloatingProgressBar } from './floating-progress-bar';

import { PlayIcon, PauseIcon } from 'lucide-react-native';
import { usePlayer } from '@/hooks/use-player';
import { useCurrentTrack, usePlaybackStatus } from '@/src/application/state/player-store';
import { getArtistNames } from '@/src/domain/entities/track';
import { getLargestArtwork } from '@/src/domain/value-objects/artwork';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const FLOATING_PLAYER_HEIGHT = 64;

export function FloatingPlayer() {
	const pathname = usePathname();
	const insets = useSafeAreaInsets();
	const currentTrack = useCurrentTrack();
	const status = usePlaybackStatus();
	const { togglePlayPause, isLoading, isBuffering } = usePlayer();

	const shouldShow = pathname !== '/player' && currentTrack !== null;

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
	}, [shouldShow]);

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

	const handlePress = () => {
		router.push('/player');
	};

	const handlePlayPause = () => {
		togglePlayPause();
	};

	if (!isVisible && !shouldShow) {
		return <View style={{ position: 'absolute', width: 0, height: 0 }} />;
	}

	return (
		<AnimatedPressable
			key="floating-player"
			onPress={handlePress}
			pointerEvents={shouldShow ? 'auto' : 'none'}
			className="absolute left-4 right-4 bg-secondary rounded-2xl overflow-hidden shadow-lg"
			style={[
				{
					bottom: insets.bottom + 8,
					height: FLOATING_PLAYER_HEIGHT,
				},
				animatedStyle,
			]}
		>
			{}
			<View className="absolute top-0 left-0 right-0 z-10">
				<FloatingProgressBar />
			</View>

			{}
			<View className="flex-1 flex-row items-center px-3 pt-1">
				{}
				<View className="relative">
					<Image
						source={{ uri: artworkUrl }}
						style={{
							width: 48,
							height: 48,
							borderRadius: 8,
						}}
						contentFit="cover"
						transition={200}
						cachePolicy="memory-disk"
						recyclingKey={currentTrack?.id.value}
					/>
					{showLoadingIndicator && (
						<View className="absolute inset-0 items-center justify-center bg-black/30 rounded-lg">
							<ActivityIndicator size="small" color="white" />
						</View>
					)}
				</View>

				{}
				<View className="flex-1 mx-3 justify-center">
					<Text className="font-semibold text-sm" numberOfLines={1}>
						{currentTrack?.title}
					</Text>
					<Text variant="muted" className="text-xs" numberOfLines={1}>
						{artistNames}
					</Text>
				</View>

				{}
				<View className="flex-row items-center gap-1">
					{}
					<Button
						variant="ghost"
						size="icon"
						onPress={handlePlayPause}
						disabled={isLoading}
						className="h-10 w-10"
					>
						<Icon as={isPlaying ? PauseIcon : PlayIcon} size={24} fill="currentColor" />
					</Button>
				</View>
			</View>
		</AnimatedPressable>
	);
}
