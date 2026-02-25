import { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { PlayerAwareScrollView } from '@/src/components/ui/player-aware-scroll-view';
import { useLocalSearchParams, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PlusIcon, ListMusicIcon, CheckIcon, MusicIcon } from 'lucide-react-native';
import { Button } from 'react-native-paper';
import { Icon } from '@/src/components/ui/icon';
import { EmptyState } from '@/src/components/ui/empty-state';
import { PageLayout } from '@/src/components/ui/page-layout';
import { CreatePlaylistSheet } from '@/src/components/playlist/create-playlist-sheet';
import { MediaListItem } from '@/src/components/media-list/media-list-item';
import { PlaylistListItem } from '@/src/components/media-list/playlist-list-item';
import { useLibraryStore, usePlaylists, useTrack } from '@/src/application/state/library-store';
import { useToast } from '@/src/hooks/use-toast';
import { useAppTheme } from '@/lib/theme';
import { getBestArtwork } from '@/src/domain/value-objects/artwork';
import { getArtistNames } from '@/src/domain/entities/track';
import type { Playlist } from '@/src/domain/entities/playlist';
import type { Track } from '@/src/domain/entities/track';

export default function AddToPlaylistScreen() {
	const insets = useSafeAreaInsets();
	const { trackId, trackData } = useLocalSearchParams<{ trackId: string; trackData?: string }>();
	const { success, error } = useToast();
	const { colors } = useAppTheme();

	const [isCreateSheetOpen, setIsCreateSheetOpen] = useState(false);

	const trackFromStore = useTrack(trackId);
	const track = trackFromStore ?? (trackData ? (JSON.parse(trackData) as Track) : undefined);
	const playlists = usePlaylists();
	const addTrackToPlaylist = useLibraryStore((state) => state.addTrackToPlaylist);

	const handleSelectPlaylist = (playlist: Playlist) => {
		if (!track) {
			error('Track not found', 'Unable to find the selected track');
			return;
		}

		addTrackToPlaylist(playlist.id, track);
		success(`Added to ${playlist.name}`, track.title);
		router.back();
	};

	const handlePlaylistCreated = (playlistId: string, playlistName: string) => {
		setIsCreateSheetOpen(false);

		if (track) {
			addTrackToPlaylist(playlistId, track);
			success(`Created "${playlistName}"`, `Added "${track.title}" to your new playlist`);
		} else {
			success(`Created "${playlistName}"`, 'Your new playlist is ready');
		}

		router.back();
	};

	const isTrackInPlaylist = (playlist: Playlist) =>
		!!trackId && playlist.tracks.some((pt) => pt.track.id.value === trackId);

	const trackArtworkUrl = track ? getBestArtwork(track.artwork, 48)?.url : undefined;

	return (
		<PageLayout
			header={{
				title: 'Add to Playlist',
				showBack: true,
				extended: true,
				backgroundColor: colors.surfaceContainerHigh,
				borderRadius: 24,
				showBorder: false,
				rightActions: (
					<Button
						mode={'text'}
						icon={() => <Icon as={PlusIcon} size={18} color={colors.primary} />}
						onPress={() => setIsCreateSheetOpen(true)}
					>
						New
					</Button>
				),
				belowTitle: track ? (
					<View style={styles.trackPreview}>
						<MediaListItem
							title={track.title}
							subtitle={getArtistNames(track)}
							artwork={{
								url: trackArtworkUrl,
								shape: 'rounded',
								fallbackIcon: MusicIcon,
								recyclingKey: trackId,
							}}
						/>
					</View>
				) : undefined,
			}}
		>
			<PlayerAwareScrollView
				contentContainerStyle={[
					styles.scrollContent,
					{ paddingBottom: insets.bottom + 80 },
				]}
			>
				{playlists.length === 0 ? (
					<EmptyState
						icon={ListMusicIcon}
						title={'No playlists yet'}
						action={
							<Button mode={'text'} onPress={() => setIsCreateSheetOpen(true)}>
								Create your first playlist
							</Button>
						}
					/>
				) : (
					playlists.map((playlist) => {
						const alreadyAdded = isTrackInPlaylist(playlist);
						return (
							<View key={playlist.id} style={alreadyAdded && styles.dimmed}>
								<PlaylistListItem
									playlist={playlist}
									onPress={alreadyAdded ? undefined : handleSelectPlaylist}
									disabled={alreadyAdded}
									accessory={
										alreadyAdded ? (
											<Icon
												as={CheckIcon}
												size={18}
												color={colors.onSurfaceVariant}
											/>
										) : undefined
									}
								/>
							</View>
						);
					})
				)}
			</PlayerAwareScrollView>

			<CreatePlaylistSheet
				isOpen={isCreateSheetOpen}
				onClose={() => setIsCreateSheetOpen(false)}
				onCreated={handlePlaylistCreated}
			/>
		</PageLayout>
	);
}

const styles = StyleSheet.create({
	trackPreview: {
		paddingHorizontal: 16,
	},
	scrollContent: {
		paddingVertical: 8,
	},
	dimmed: {
		opacity: 0.5,
	},
});
