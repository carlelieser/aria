import { View, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useCallback, useEffect, useState } from 'react';
import { router, usePathname } from 'expo-router';
import { Text, IconButton } from 'react-native-paper';
import { Icon } from '@/src/components/ui/icon';
import { ChevronLeftIcon } from 'lucide-react-native';
import { PlayerControls } from '@/src/components/player/player-controls';
import { ProgressBar } from '@/src/components/player/progress-bar';
import { TrackOptionsMenu } from '@/src/components/track-options-menu';
import { LyricsDisplay } from '@/src/components/player/lyrics-display';
import { usePlayer } from '@/src/hooks/use-player';
import { useLyrics } from '@/src/hooks/use-lyrics';
import { getLargestArtwork } from '@/src/domain/value-objects/artwork';
import { getArtistNames } from '@/src/domain/entities/track';
import { useAppTheme } from '@/lib/theme';
import { useDetailsPageTheme } from '@/src/hooks/use-details-page-theme';
import { useShowLyrics } from '@/src/application/state/player-ui-store';

const BLUR_INTENSITY = 80;

export default function PlayerScreen() {
	const pathname = usePathname();
	const { currentTrack, error } = usePlayer();
	const { colors } = useAppTheme();
	const showLyrics = useShowLyrics();
	const [artworkLoaded, setArtworkLoaded] = useState(false);

	useLyrics();

	const artwork = currentTrack ? getLargestArtwork(currentTrack.artwork) : undefined;
	const artworkUrl = artwork?.url;

	const { headerColors, hasCustomColors } = useDetailsPageTheme(artworkUrl);
	const trackInfoColors = hasCustomColors ? headerColors : colors;

	useEffect(() => {
		if (!currentTrack && pathname === '/player') {
			router.back();
		}
	}, [currentTrack, pathname]);

	useEffect(() => {
		setArtworkLoaded(false);
	}, [artworkUrl]);

	const handleArtworkLoad = useCallback(() => {
		setArtworkLoaded(true);
	}, []);

	if (!currentTrack) {
		return null;
	}

	const artistNames = getArtistNames(currentTrack);
	const albumName = currentTrack.album?.name;

	return (
		<View style={[styles.container, { backgroundColor: colors.background }]}>
			{artworkUrl && (
				<View style={StyleSheet.absoluteFill}>
					<Image
						source={{ uri: artworkUrl }}
						style={StyleSheet.absoluteFill}
						contentFit={'cover'}
					/>
					<BlurView
						intensity={BLUR_INTENSITY}
						experimentalBlurMethod={'dimezisBlurView'}
						style={StyleSheet.absoluteFill}
						tint={'dark'}
					/>
					<LinearGradient
						colors={[colors.background, 'transparent']}
						style={StyleSheet.absoluteFill}
						locations={[0, 0.4]}
					/>
					<LinearGradient
						colors={['transparent', colors.background]}
						style={StyleSheet.absoluteFill}
						locations={[0.6, 1]}
					/>
				</View>
			)}

			<SafeAreaView style={styles.safeArea}>
				<View style={styles.content}>
					<View style={styles.header}>
						<IconButton
							icon={() => (
								<Icon as={ChevronLeftIcon} size={24} color={colors.onSurface} />
							)}
							onPress={() => router.back()}
						/>
						<Text variant={'labelLarge'} style={{ color: colors.onSurfaceVariant }}>
							{showLyrics ? 'Lyrics' : 'Now Playing'}
						</Text>
						<TrackOptionsMenu
							track={currentTrack}
							source={'player'}
							orientation={'horizontal'}
						/>
					</View>

					<View style={styles.artworkContainer}>
						{showLyrics ? (
							<LyricsDisplay />
						) : (
							<View
								style={[
									styles.artworkWrapper,
									artworkLoaded && styles.artworkShadow,
								]}
							>
								{artworkUrl ? (
									<Image
										source={{ uri: artworkUrl }}
										style={styles.artwork}
										contentFit={'cover'}
										transition={300}
										cachePolicy={'memory-disk'}
										recyclingKey={currentTrack.id.value}
										onLoad={handleArtworkLoad}
									/>
								) : (
									<View
										style={[
											styles.artwork,
											styles.artworkPlaceholder,
											{ backgroundColor: colors.surfaceContainerHighest },
										]}
									/>
								)}
							</View>
						)}
					</View>

					<View style={styles.trackInfo}>
						<Text
							variant={'headlineSmall'}
							numberOfLines={2}
							style={{ color: trackInfoColors.onSurface, fontWeight: '700' }}
						>
							{currentTrack.title}
						</Text>
						<Text
							variant={'titleMedium'}
							numberOfLines={1}
							style={{ color: trackInfoColors.onSurfaceVariant }}
						>
							{albumName ? `${artistNames} \u2022 ${albumName}` : artistNames}
						</Text>
					</View>

					{error && (
						<View
							style={[
								styles.errorContainer,
								{ backgroundColor: `${colors.error}1A` },
							]}
						>
							<Text variant={'bodySmall'} style={{ color: colors.error }}>
								{error}
							</Text>
						</View>
					)}

					<View style={styles.progressContainer}>
						<ProgressBar seekable={true} />
					</View>

					<PlayerControls size={'lg'} />
				</View>
			</SafeAreaView>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
	},
	safeArea: {
		flex: 1,
	},
	content: {
		flex: 1,
		paddingTop: 8,
		paddingHorizontal: 24,
		paddingBottom: 24,
	},
	header: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginBottom: 32,
	},
	artworkContainer: {
		flex: 1,
		width: '100%',
		justifyContent: 'center',
	},
	artworkWrapper: {
		borderRadius: 16,
	},
	artworkShadow: {
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 16 },
		shadowOpacity: 0.35,
		shadowRadius: 32,
		elevation: 24,
	},
	artwork: {
		width: '100%',
		aspectRatio: 1,
		borderRadius: 16,
	},
	artworkPlaceholder: {
		justifyContent: 'center',
		alignItems: 'center',
	},
	trackInfo: {
		gap: 4,
		marginTop: 32,
		marginBottom: 24,
	},
	errorContainer: {
		paddingVertical: 8,
		paddingHorizontal: 16,
		borderRadius: 12,
		marginBottom: 16,
	},
	progressContainer: {
		marginBottom: 24,
	},
});
