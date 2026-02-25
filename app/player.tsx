import { View, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Image } from 'expo-image';
import { BlurView } from 'expo-blur';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import { router, usePathname } from 'expo-router';
import { Text, IconButton } from 'react-native-paper';
import LottieView from 'lottie-react-native';
import type { AnimationObject } from 'lottie-react-native';
import { Icon } from '@/src/components/ui/icon';
import { ChevronLeftIcon, ListMusic } from 'lucide-react-native';

const thumbUpRegular = require('@/assets/animation/system-regular-124-thumb-up-hover-thumb-up.json') as AnimationObject;
const thumbUpSolid = require('@/assets/animation/system-solid-124-thumb-up-hover-thumb-up.json') as AnimationObject;
import { PlayerControls } from '@/src/components/player/player-controls';
import { ProgressBar } from '@/src/components/player/progress-bar';
import { TrackOptionsMenu } from '@/src/components/track-options-menu';
import { LyricsDisplay } from '@/src/components/player/lyrics-display';
import { PlayerThemeProvider, usePlayerTheme } from '@/src/components/player/player-theme-context';
import { useLyrics } from '@/src/hooks/use-lyrics';
import { getLargestArtwork } from '@/src/domain/value-objects/artwork';
import { getArtistNames } from '@/src/domain/entities/track';
import { useAppTheme } from '@/lib/theme';
import { useShowLyrics, usePlayerUIStore } from '@/src/application/state/player-ui-store';
import { useLibraryStore, useIsFavorite } from '@/src/application/state/library-store';
import { useCurrentTrack, usePlayerError } from '@/src/application/state/player-store';

const BLUR_INTENSITY = 120;
const DARK_SCRIM_OPACITY = 0.6;
function hexToRgbArray(hex: string): [number, number, number, number] {
	const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
	if (!result) return [0, 0, 0, 1];
	return [
		parseInt(result[1], 16) / 255,
		parseInt(result[2], 16) / 255,
		parseInt(result[3], 16) / 255,
		1,
	];
}

function replaceColorsInSource(source: AnimationObject, color: string): AnimationObject {
	const rgbArray = hexToRgbArray(color);
	const json = JSON.stringify(source);
	const replaced = json.replace(
		/"c"\s*:\s*\{\s*"a"\s*:\s*0\s*,\s*"k"\s*:\s*\[\s*[\d.]+\s*,\s*[\d.]+\s*,\s*[\d.]+\s*,\s*[\d.]+\s*\]/g,
		`"c":{"a":0,"k":[${rgbArray.join(',')}]`
	);
	return JSON.parse(replaced) as AnimationObject;
}

export default function PlayerScreen() {
	const currentTrack = useCurrentTrack();
	const artwork = currentTrack ? getLargestArtwork(currentTrack.artwork) : undefined;
	const artworkUrl = artwork?.url;

	return (
		<PlayerThemeProvider artworkUrl={artworkUrl}>
			<PlayerScreenContent />
		</PlayerThemeProvider>
	);
}

function PlayerScreenContent() {
	const pathname = usePathname();
	const currentTrack = useCurrentTrack();
	const error = usePlayerError();
	const { colors: appColors, isDark } = useAppTheme();
	const { colors, backgroundStyle, dominantColor } = usePlayerTheme();
	const showLyrics = useShowLyrics();
	const openQueueSheet = usePlayerUIStore((s) => s.openQueueSheet);
	const [artworkLoaded, setArtworkLoaded] = useState(false);

	useLyrics();

	const trackId = currentTrack?.id.value ?? '';
	const isFavorite = useIsFavorite(trackId);
	const lottieRef = useRef<LottieView>(null);

	const coloredSource = useMemo(
		() => replaceColorsInSource(
			isFavorite ? thumbUpSolid : thumbUpRegular,
			isFavorite ? colors.primary : colors.onSurfaceVariant
		),
		[isFavorite, colors.primary, colors.onSurfaceVariant]
	);

	const handleToggleFavorite = useCallback(() => {
		const store = useLibraryStore.getState();
		if (currentTrack && !isFavorite) {
			store.addTrack(currentTrack);
		}
		store.toggleFavorite(trackId);
		requestAnimationFrame(() => {
			lottieRef.current?.reset();
			lottieRef.current?.play();
		});
	}, [currentTrack, trackId, isFavorite]);

	const artwork = currentTrack ? getLargestArtwork(currentTrack.artwork) : undefined;
	const artworkUrl = artwork?.url;

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

	// Artwork-blur and artwork-solid always have dark backgrounds → light status bar
	// Theme-color follows the app theme
	const statusBarStyle =
		backgroundStyle === 'theme-color' ? (isDark ? 'light' : 'dark') : 'light';

	return (
		<View style={[styles.container, { backgroundColor: appColors.background }]}>
			<StatusBar style={statusBarStyle} />
			{renderBackground(backgroundStyle, artworkUrl, appColors.background, dominantColor)}

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
						<View style={styles.headerActions}>
							<IconButton
								icon={() => (
									<Icon
										as={ListMusic}
										size={20}
										color={colors.onSurfaceVariant}
									/>
								)}
								onPress={openQueueSheet}
								size={20}
								accessibilityLabel={'Open queue'}
							/>
							<TrackOptionsMenu
								track={currentTrack}
								source={'player'}
								orientation={'horizontal'}
								iconColor={colors.onSurfaceVariant}
							/>
						</View>
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
											{ backgroundColor: appColors.surfaceContainerHighest },
										]}
									/>
								)}
							</View>
						)}
					</View>

					<View style={styles.trackInfo}>
						<View style={styles.trackInfoText}>
							<Text
								variant={'headlineSmall'}
								numberOfLines={2}
								style={{ color: colors.onSurface, fontWeight: '700' }}
							>
								{currentTrack.title}
							</Text>
							<Text
								variant={'titleMedium'}
								numberOfLines={1}
								style={{ color: colors.onSurfaceVariant }}
							>
								{albumName ? `${artistNames} \u2022 ${albumName}` : artistNames}
							</Text>
						</View>
						<IconButton
							icon={() => (
								<LottieView
									ref={lottieRef}
									source={coloredSource}
									style={styles.favoriteIcon}
									autoPlay={false}
									loop={false}
								/>
							)}
							onPress={handleToggleFavorite}
	
							accessibilityLabel={
								isFavorite ? 'Remove from favorites' : 'Add to favorites'
							}
						/>
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

function renderBackground(
	style: string,
	artworkUrl: string | undefined,
	backgroundColor: string,
	dominantColor: string | null
) {
	if (style === 'theme-color') {
		return null;
	}

	if (style === 'artwork-solid') {
		const solidColor = dominantColor ?? backgroundColor;
		return (
			<View style={StyleSheet.absoluteFill}>
				<View style={[StyleSheet.absoluteFill, { backgroundColor: solidColor }]} />
				<View
					style={[
						StyleSheet.absoluteFill,
						{ backgroundColor: `rgba(0,0,0,${DARK_SCRIM_OPACITY})` },
					]}
				/>
			</View>
		);
	}

	// artwork-blur (default)
	if (!artworkUrl) return null;

	return (
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
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
		marginTop: 32,
		marginBottom: 24,
	},
	trackInfoText: {
		flex: 1,
		gap: 4,
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
	headerActions: {
		flexDirection: 'row',
		alignItems: 'center',
	},
	favoriteIcon: {
		width: 32,
		height: 32,
	},
});
