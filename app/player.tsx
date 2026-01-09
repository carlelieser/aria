import {View, ActivityIndicator} from "react-native";
import {Image} from "expo-image";
import {SafeAreaView} from "react-native-safe-area-context";
import {useEffect} from "react";
import {router, usePathname} from "expo-router";
import {Button} from "@/components/ui/button";
import {Text} from "@/components/ui/text";
import {Icon} from "@/components/ui/icon";
import {ArrowLeftIcon} from "lucide-react-native";
import {PlayerControls} from "@/components/player-controls";
import {ProgressBar} from "@/components/progress-bar";
import {usePlayer} from "@/hooks/use-player";
import {getLargestArtwork} from "@/src/domain/value-objects/artwork";
import {getArtistNames} from "@/src/domain/entities/track";

export default function PlayerScreen() {
	const pathname = usePathname();
	const { currentTrack, isLoading, isBuffering, error } = usePlayer();

	useEffect(() => {
		// Navigate back if there's no track playing
		if (!currentTrack && pathname === "/player") {
			router.back();
		}
	}, [currentTrack, pathname]);

	// If no track, show nothing (will navigate back via useEffect)
	if (!currentTrack) {
		return null;
	}

	const artwork = getLargestArtwork(currentTrack.artwork);
	const artworkUrl = artwork?.url;
	const artistNames = getArtistNames(currentTrack);
	const albumName = currentTrack.album?.name;

	return (
		<SafeAreaView className="bg-background flex-1">
			<View className="flex-1 pt-2 px-6 pb-6">
				{/* Header */}
				<View className="flex-row justify-between items-center mb-8">
					<Button size="sm" variant="ghost" onPress={() => router.back()}>
						<Icon as={ArrowLeftIcon} />
					</Button>
					<Text variant="muted" className="text-sm">Now Playing</Text>
					<View style={{ width: 40 }} />
				</View>

				{/* Artwork */}
				<View className="flex-1 w-full justify-center">
					<Image
						source={{ uri: artworkUrl }}
						style={{
							width: '100%',
							aspectRatio: 1,
							borderRadius: 16,
						}}
						contentFit="cover"
						transition={300}
					/>

					{/* Loading/Buffering Indicator */}
					{(isLoading || isBuffering) && (
						<View className="absolute inset-0 items-center justify-center">
							<ActivityIndicator size="large" />
						</View>
					)}
				</View>

				{/* Track Info */}
				<View className="gap-2 mt-8 mb-6">
					<Text className="text-2xl font-bold" numberOfLines={2}>
						{currentTrack.title}
					</Text>
					<Text variant="muted" className="text-lg" numberOfLines={1}>
						{artistNames}
					</Text>
					{albumName && (
						<Text variant="muted" className="text-sm" numberOfLines={1}>
							{albumName}
						</Text>
					)}
				</View>

				{/* Error Display */}
				{error && (
					<View className="py-2 px-4 bg-destructive/10 rounded-lg mb-4">
						<Text className="text-destructive text-sm">{error}</Text>
					</View>
				)}

				{/* Progress Bar */}
				<View className="mb-6">
					<ProgressBar seekable={true} />
				</View>

				{/* Player Controls */}
				<PlayerControls size="lg" />
			</View>
		</SafeAreaView>
	);
}