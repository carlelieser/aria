import { useEffect, useMemo } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams, router } from 'expo-router';
import { DiscIcon, SearchIcon, UserIcon } from 'lucide-react-native';
import { Text, Button, ActivityIndicator, IconButton } from 'react-native-paper';
import { Icon } from '@/components/ui/icon';
import { DetailsPage } from '@/components/details-page';
import { TrackListItem } from '@/components/track-list-item';
import { useTracks } from '@/src/application/state/library-store';
import {
	useArtistDetail,
	useArtistLoading,
	useArtistError,
} from '@/src/application/state/artist-store';
import { useAlbumStore } from '@/src/application/state/album-store';
import { artistService } from '@/src/application/services/artist-service';
import { getBestArtwork } from '@/src/domain/value-objects/artwork';
import { useAppTheme, M3Shapes } from '@/lib/theme';
import type { Track } from '@/src/domain/entities/track';
import type { Album } from '@/src/domain/entities/album';
import type {
	DetailsHeaderInfo,
	MetadataLine,
	DetailsPageSection,
} from '@/components/details-page';

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

function formatListeners(count: number): string {
	if (count >= 1000000) {
		return `${(count / 1000000).toFixed(1)}M monthly listeners`;
	}
	if (count >= 1000) {
		return `${(count / 1000).toFixed(0)}K monthly listeners`;
	}
	return `${count} monthly listeners`;
}

interface AlbumCardProps {
	readonly album: Album;
	readonly onPress: () => void;
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
			pathname: '/search',
			params: { query: artistInfo.name },
		});
	};

	const handleAlbumPress = (album: Album) => {
		useAlbumStore.getState().setAlbumPreview(album);
		router.push({
			pathname: '/album/[id]',
			params: { id: album.id.value, name: album.name },
		});
	};

	const headerRightActions = (
		<IconButton
			icon={() => <Icon as={SearchIcon} size={22} color={colors.onSurface} />}
			onPress={handleSearchArtist}
		/>
	);

	const metadata: MetadataLine[] = useMemo(() => {
		const lines: MetadataLine[] = [];
		if (artistInfo.monthlyListeners) {
			lines.push({ text: formatListeners(artistInfo.monthlyListeners), variant: 'primary' });
		}
		if (libraryTracks.length > 0) {
			lines.push({
				text: `${libraryTracks.length} ${libraryTracks.length === 1 ? 'track' : 'tracks'} in library`,
			});
		}
		return lines;
	}, [artistInfo.monthlyListeners, libraryTracks.length]);

	const headerInfo: DetailsHeaderInfo = {
		title: artistInfo.name,
		artworkUrl: artistInfo.artwork,
		artworkShape: 'circular',
		placeholderIcon: UserIcon,
		metadata,
	};

	const sections: DetailsPageSection[] = useMemo(() => {
		const result: DetailsPageSection[] = [];

		if (albums.length > 0) {
			result.push({
				key: 'albums',
				title: 'Albums',
				horizontal: true,
				content: (
					<>
						{albums.map((album) => (
							<AlbumCard
								key={album.id.value}
								album={album}
								onPress={() => handleAlbumPress(album)}
							/>
						))}
					</>
				),
			});
		}

		if (libraryTracks.length > 0) {
			result.push({
				key: 'library',
				title: 'In Your Library',
				content: (
					<View style={styles.trackList}>
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
				),
			});
		}

		return result;
	}, [albums, libraryTracks]);

	const renderLoadingOrError = () => {
		if (isLoading && !hasData) {
			return (
				<View style={styles.loadingState}>
					<ActivityIndicator size="large" color={colors.primary} />
				</View>
			);
		}

		if (error && !hasData) {
			return (
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
			);
		}

		if (albums.length === 0 && libraryTracks.length === 0) {
			return (
				<View style={styles.emptyState}>
					<Text variant="bodyMedium" style={{ color: colors.onSurfaceVariant }}>
						No content found for this artist
					</Text>
					<Button mode="text" onPress={handleSearchArtist}>
						Search for tracks
					</Button>
				</View>
			);
		}

		return null;
	};

	const loadingOrError = renderLoadingOrError();

	return (
		<DetailsPage
			pageTitle="Artist"
			headerInfo={headerInfo}
			headerRightActions={headerRightActions}
			sections={loadingOrError ? [] : sections}
			emptyContent={loadingOrError}
		/>
	);
}

const styles = StyleSheet.create({
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
	trackList: {
		gap: 8,
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
