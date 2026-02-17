import { useEffect, useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { SearchIcon, UserIcon } from 'lucide-react-native';
import { Text, Button, ActivityIndicator, IconButton } from 'react-native-paper';
import { Icon } from '@/src/components/ui/icon';
import { DetailsPage, useDetailsPageHeaderColors } from '@/src/components/details-page';
import { TrackListItem } from '@/src/components/media-list/track-list-item';
import { AlbumCard } from '@/src/components/media-list/album-card';
import { useLibraryArtistTracks } from '@/src/hooks/use-library-artist-tracks';
import { getArtistName } from '@/src/domain/utils/artist-utils';
import {
	useArtistDetail,
	useArtistLoading,
	useArtistError,
} from '@/src/application/state/artist-store';
import { useAlbumStore } from '@/src/application/state/album-store';
import { artistService } from '@/src/application/services/artist-service';
import { getBestArtwork } from '@/src/domain/value-objects/artwork';
import { useAppTheme } from '@/lib/theme';
import { formatListeners } from '@/src/domain/utils/formatting';
import type { Album } from '@/src/domain/entities/album';
import type {
	DetailsHeaderInfo,
	MetadataLine,
	DetailsPageSection,
} from '@/src/components/details-page';

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
		<SearchAction onPress={handleSearchArtist} />
	);

	const metadata: MetadataLine[] = useMemo(() => {
		const lines: MetadataLine[] = [];
		if (artistInfo.monthlyListeners) {
			lines.push({ text: formatListeners(artistInfo.monthlyListeners, 'monthly listeners')!, variant: 'primary' });
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

function SearchAction({ onPress }: { readonly onPress: () => void }) {
	const colors = useDetailsPageHeaderColors();
	return (
		<IconButton
			icon={() => <Icon as={SearchIcon} size={22} color={colors.onSurface} />}
			onPress={onPress}
		/>
	);
}

const styles = StyleSheet.create({
	trackList: {
		gap: 8,
		paddingHorizontal: 24,
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
