/**
 * ArtistScreen
 *
 * Display artist details and albums.
 * Uses M3 theming.
 */

import { useEffect } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { PlayerAwareScrollView } from '@/components/ui/player-aware-scroll-view';
import { Image } from 'expo-image';
import { useLocalSearchParams, router } from 'expo-router';
import { DiscIcon, SearchIcon, UserIcon } from 'lucide-react-native';
import { Text, Button, ActivityIndicator, IconButton } from 'react-native-paper';
import { Icon } from '@/components/ui/icon';
import { PageLayout } from '@/components/page-layout';
import { TrackListItem } from '@/components/track-list-item';
import { useTracks } from '@/src/application/state/library-store';
import {
	useArtistDetail,
	useArtistLoading,
	useArtistError,
} from '@/src/application/state/artist-store';
import { artistService } from '@/src/application/services/artist-service';
import { getBestArtwork } from '@/src/domain/value-objects/artwork';
import { useAppTheme, M3Shapes } from '@/lib/theme';
import type { Track } from '@/src/domain/entities/track';
import type { Album } from '@/src/domain/entities/album';

function useLibraryArtistTracks(artistId: string): Track[] {
	const tracks = useTracks();
	return tracks.filter((track) => track.artists.some((artist) => artist.id === artistId));
}

function getArtistName(tracks: Track[], artistId: string, fallbackName?: string): string {
	for (const track of tracks) {
		const artist = track.artists.find((a) => a.id === artistId);
		if (artist) return artist.name;
	}
	return fallbackName ?? 'Unknown Artist';
}

interface AlbumCardProps {
	album: Album;
	onPress: () => void;
}

function AlbumCard({ album, onPress }: AlbumCardProps) {
	const { colors } = useAppTheme();
	const artwork = getBestArtwork(album.artwork, 160);

	return (
		<Pressable
			onPress={onPress}
			style={({ pressed }) => [styles.albumCard, pressed && styles.pressed]}
		>
			{artwork?.url ? (
				<Image
					source={{ uri: artwork.url }}
					style={styles.albumArtwork}
					contentFit="cover"
					transition={200}
				/>
			) : (
				<View
					style={[
						styles.albumArtwork,
						{ backgroundColor: colors.surfaceContainerHighest },
					]}
				>
					<Icon as={DiscIcon} size={32} color={colors.onSurfaceVariant} />
				</View>
			)}
			<Text
				variant="bodyMedium"
				numberOfLines={2}
				style={[styles.albumTitle, { color: colors.onSurface }]}
			>
				{album.name}
			</Text>
			{album.releaseDate && (
				<Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>
					{new Date(album.releaseDate).getFullYear()}
				</Text>
			)}
		</Pressable>
	);
}

export default function ArtistScreen() {
	const { id, name } = useLocalSearchParams<{ id: string; name?: string }>();
	const { colors } = useAppTheme();

	const libraryTracks = useLibraryArtistTracks(id);
	const artistDetail = useArtistDetail(id);
	const isLoading = useArtistLoading(id);
	const error = useArtistError(id);

	useEffect(() => {
		artistService.getArtistDetail(id);
	}, [id]);

	const artistInfo = artistDetail.artist
		? {
				name: artistDetail.artist.name,
				artwork: getBestArtwork(artistDetail.artist.artwork, 200)?.url,
				monthlyListeners: artistDetail.artist.monthlyListeners,
			}
		: {
				name: getArtistName(libraryTracks, id, name),
				artwork: undefined,
				monthlyListeners: undefined,
			};

	const hasData = artistDetail.artist !== null || libraryTracks.length > 0;
	const albums = artistDetail.albums;

	const handleSearchArtist = () => {
		router.push({
			pathname: '/explore',
			params: { query: artistInfo.name },
		});
	};

	const handleAlbumPress = (album: Album) => {
		router.push({
			pathname: '/album/[id]',
			params: { id: album.id.value, name: album.name },
		});
	};

	const formatListeners = (count: number): string => {
		if (count >= 1000000) {
			return `${(count / 1000000).toFixed(1)}M monthly listeners`;
		}
		if (count >= 1000) {
			return `${(count / 1000).toFixed(0)}K monthly listeners`;
		}
		return `${count} monthly listeners`;
	};

	const headerContent = (
		<View style={styles.artistInfo}>
			{artistInfo.artwork ? (
				<Image source={{ uri: artistInfo.artwork }} style={styles.artistAvatar} />
			) : (
				<View
					style={[
						styles.artistAvatar,
						{ backgroundColor: colors.surfaceContainerHighest },
					]}
				>
					<Icon as={UserIcon} size={48} color={colors.onSurfaceVariant} />
				</View>
			)}
			<View style={styles.artistText}>
				<Text
					variant="headlineSmall"
					style={{
						color: colors.onSurface,
						fontWeight: '700',
						textAlign: 'center',
					}}
				>
					{artistInfo.name}
				</Text>
				{artistInfo.monthlyListeners && (
					<Text variant="bodyMedium" style={{ color: colors.onSurfaceVariant }}>
						{formatListeners(artistInfo.monthlyListeners)}
					</Text>
				)}
				{libraryTracks.length > 0 && (
					<Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>
						{libraryTracks.length} {libraryTracks.length === 1 ? 'track' : 'tracks'} in
						library
					</Text>
				)}
			</View>
		</View>
	);

	const headerRightActions = (
		<IconButton
			icon={() => <Icon as={SearchIcon} size={22} color={colors.onSurface} />}
			onPress={handleSearchArtist}
		/>
	);

	return (
		<PageLayout
			header={{
				title: 'Artist',
				showBack: true,
				backgroundColor: colors.surfaceContainerHigh,
				borderRadius: 24,
				belowTitle: headerContent,
				rightActions: headerRightActions,
				extended: true,
				compact: true,
			}}
		>
			<PlayerAwareScrollView contentContainerStyle={styles.scrollContent}>
				{isLoading && !hasData ? (
					<View style={styles.loadingState}>
						<ActivityIndicator size="large" color={colors.primary} />
					</View>
				) : error && !hasData ? (
					<View style={styles.emptyState}>
						<Text
							variant="bodyMedium"
							style={{ color: colors.onSurfaceVariant, textAlign: 'center' }}
						>
							{error}
						</Text>
						<Button mode="text" onPress={handleSearchArtist}>
							Search instead
						</Button>
					</View>
				) : (
					<>
						{albums.length > 0 && (
							<View style={styles.section}>
								<Text
									variant="titleMedium"
									style={[styles.sectionTitle, { color: colors.onSurface }]}
								>
									Albums
								</Text>
								<PlayerAwareScrollView
									horizontal
									showsHorizontalScrollIndicator={false}
									style={styles.albumsScrollView}
									contentContainerStyle={styles.albumsRow}
								>
									{albums.map((album) => (
										<AlbumCard
											key={album.id.value}
											album={album}
											onPress={() => handleAlbumPress(album)}
										/>
									))}
								</PlayerAwareScrollView>
							</View>
						)}

						{libraryTracks.length > 0 && (
							<View style={styles.section}>
								<Text
									variant="titleMedium"
									style={[styles.sectionTitle, { color: colors.onSurface }]}
								>
									In Your Library
								</Text>
								{libraryTracks.map((track, index) => (
									<TrackListItem
										key={track.id.value}
										track={track}
										source="library"
										queue={libraryTracks}
										queueIndex={index}
									/>
								))}
							</View>
						)}

						{albums.length === 0 && libraryTracks.length === 0 && (
							<View style={styles.emptyState}>
								<Text
									variant="bodyMedium"
									style={{ color: colors.onSurfaceVariant }}
								>
									No content found for this artist
								</Text>
								<Button mode="text" onPress={handleSearchArtist}>
									Search for tracks
								</Button>
							</View>
						)}
					</>
				)}
			</PlayerAwareScrollView>
		</PageLayout>
	);
}

const styles = StyleSheet.create({
	artistInfo: {
		alignItems: 'center',
		gap: 16,
		paddingHorizontal: 16,
	},
	artistAvatar: {
		width: 120,
		height: 120,
		borderRadius: 60,
		alignItems: 'center',
		justifyContent: 'center',
	},
	artistText: {
		alignItems: 'center',
		gap: 4,
	},
	scrollContent: {
		paddingVertical: 16,
	},
	section: {
		marginBottom: 24,
		paddingHorizontal: 16,
	},
	sectionTitle: {
		fontWeight: '600',
		marginBottom: 12,
	},
	albumsScrollView: {
		borderRadius: 12,
		overflow: 'hidden',
	},
	albumsRow: {
		paddingHorizontal: 16,
		gap: 12,
	},
	albumCard: {
		width: 140,
	},
	pressed: {
		opacity: 0.7,
	},
	albumArtwork: {
		width: 140,
		height: 140,
		borderRadius: M3Shapes.medium,
		alignItems: 'center',
		justifyContent: 'center',
		marginBottom: 8,
	},
	albumTitle: {
		fontWeight: '500',
	},
	loadingState: {
		paddingVertical: 48,
		alignItems: 'center',
	},
	emptyState: {
		paddingVertical: 48,
		alignItems: 'center',
	},
});
