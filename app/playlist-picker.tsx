import { useState } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { PlayerAwareScrollView } from '@/src/components/ui/player-aware-scroll-view';
import { useLocalSearchParams, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PlusIcon, ListMusicIcon, CheckIcon } from 'lucide-react-native';
import { Text, Button } from 'react-native-paper';
import { Icon } from '@/src/components/ui/icon';
import { EmptyState } from '@/src/components/ui/empty-state';
import { PageLayout } from '@/src/components/ui/page-layout';
import { CreatePlaylistSheet } from '@/src/components/playlist/create-playlist-sheet';
import { useLibraryStore, usePlaylists, useTrack } from '@/src/application/state/library-store';
import { useToast } from '@/src/hooks/use-toast';
import { useAppTheme } from '@/lib/theme';
import type { Playlist } from '@/src/domain/entities/playlist';

interface PlaylistItemProps {
	playlist: Playlist;
	onSelect: () => void;
	trackAlreadyIn: boolean;
}

function PlaylistItem({ playlist, onSelect, trackAlreadyIn }: PlaylistItemProps) {
	const { colors } = useAppTheme();

	return (
		<Pressable
			style={[styles.playlistItem, trackAlreadyIn && { opacity: 0.6 }]}
			onPress={onSelect}
			disabled={trackAlreadyIn}
		>
			<View style={[styles.playlistIcon, { backgroundColor: colors.surfaceContainerHigh }]}>
				<Icon as={ListMusicIcon} size={24} color={colors.onSurfaceVariant} />
			</View>
			<View style={styles.playlistText}>
				<Text
					variant={'bodyMedium'}
					style={{ color: trackAlreadyIn ? colors.onSurfaceVariant : colors.onSurface }}
				>
					{playlist.name}
				</Text>
				<Text variant={'bodySmall'} style={{ color: colors.onSurfaceVariant }}>
					{playlist.tracks.length} {playlist.tracks.length === 1 ? 'track' : 'tracks'}
				</Text>
			</View>
			{trackAlreadyIn && (
				<View style={styles.addedIndicator}>
					<Icon as={CheckIcon} size={16} color={colors.onSurfaceVariant} />
					<Text variant={'bodySmall'} style={{ color: colors.onSurfaceVariant }}>
						Added
					</Text>
				</View>
			)}
		</Pressable>
	);
}

export default function PlaylistPickerScreen() {
	const insets = useSafeAreaInsets();
	const { trackId } = useLocalSearchParams<{ trackId: string }>();
	const { success, error } = useToast();
	const { colors } = useAppTheme();

	const [isCreateSheetOpen, setIsCreateSheetOpen] = useState(false);

	const track = useTrack(trackId);
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

	const isTrackInPlaylist = (playlist: Playlist): boolean => {
		if (!trackId) return false;
		return playlist.tracks.some((pt) => pt.track.id.value === trackId);
	};

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
					<View
						style={[styles.trackPreview, { backgroundColor: `${colors.background}80` }]}
					>
						<Text
							variant={'bodyMedium'}
							numberOfLines={1}
							style={{ color: colors.onSurface, fontWeight: '500' }}
						>
							{track.title}
						</Text>
						<Text
							variant={'bodySmall'}
							numberOfLines={1}
							style={{ color: colors.onSurfaceVariant }}
						>
							{track.artists.map((a) => a.name).join(', ')}
						</Text>
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
					playlists.map((playlist) => (
						<PlaylistItem
							key={playlist.id}
							playlist={playlist}
							onSelect={() => handleSelectPlaylist(playlist)}
							trackAlreadyIn={isTrackInPlaylist(playlist)}
						/>
					))
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
		padding: 12,
		borderRadius: 12,
		marginHorizontal: 16,
	},
	scrollContent: {
		paddingVertical: 8,
	},
	playlistItem: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 16,
		paddingHorizontal: 16,
		paddingVertical: 12,
	},
	playlistIcon: {
		width: 48,
		height: 48,
		borderRadius: 8,
		alignItems: 'center',
		justifyContent: 'center',
	},
	playlistText: {
		flex: 1,
	},
	addedIndicator: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 4,
	},
});
