/**
 * BatchPlaylistPicker Component
 *
 * Bottom sheet for selecting a playlist to add multiple tracks to.
 * Supports creating new playlists via CreatePlaylistSheet.
 */

import { useCallback, useState } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { PlayerAwareScrollView } from '@/src/components/ui/player-aware-scroll-view';
import { Text, Button } from 'react-native-paper';
import { ManagedBottomSheet } from '@/src/components/ui/managed-bottom-sheet';
import { ListMusicIcon, PlusIcon } from 'lucide-react-native';
import { Icon } from '@/src/components/ui/icon';
import { EmptyState } from '@/src/components/ui/empty-state';
import { CreatePlaylistSheet } from './create-playlist-sheet';
import { usePlaylists } from '@/src/application/state/library-store';
import { useAppTheme } from '@/lib/theme';
import type { Playlist } from '@/src/domain/entities/playlist';

interface BatchPlaylistPickerProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly onSelectPlaylist: (playlistId: string) => void;
	readonly selectedCount: number;
}

interface PlaylistItemProps {
	readonly playlist: Playlist;
	readonly onSelect: () => void;
}

function PlaylistItem({ playlist, onSelect }: PlaylistItemProps) {
	const { colors } = useAppTheme();

	return (
		<Pressable style={styles.playlistItem} onPress={onSelect}>
			<View
				style={[styles.playlistIcon, { backgroundColor: colors.surfaceContainerHighest }]}
			>
				<Icon as={ListMusicIcon} size={24} color={colors.onSurfaceVariant} />
			</View>
			<View style={styles.playlistText}>
				<Text variant={'bodyMedium'} style={{ color: colors.onSurface }}>
					{playlist.name}
				</Text>
				<Text variant={'bodySmall'} style={{ color: colors.onSurfaceVariant }}>
					{playlist.tracks.length} {playlist.tracks.length === 1 ? 'track' : 'tracks'}
				</Text>
			</View>
		</Pressable>
	);
}

export function BatchPlaylistPicker({
	isOpen,
	onClose,
	onSelectPlaylist,
	selectedCount,
}: BatchPlaylistPickerProps) {
	const { colors } = useAppTheme();
	const [isCreateSheetOpen, setIsCreateSheetOpen] = useState(false);

	const playlists = usePlaylists();

	const handleClose = useCallback(() => {
		setIsCreateSheetOpen(false);
		onClose();
	}, [onClose]);

	const handlePlaylistCreated = useCallback(
		(playlistId: string) => {
			setIsCreateSheetOpen(false);
			onSelectPlaylist(playlistId);
		},
		[onSelectPlaylist]
	);

	return (
		<>
			<ManagedBottomSheet
				portalName={'batch-playlist-picker'}
				isOpen={isOpen}
				onClose={handleClose}
				snapPoints={['60%']}
			>
				<View style={styles.header}>
					<Text
						variant={'titleMedium'}
						style={[styles.title, { color: colors.onSurface }]}
					>
						Add {selectedCount} tracks to playlist
					</Text>
					<Button
						mode={'text'}
						icon={() => <Icon as={PlusIcon} size={18} color={colors.primary} />}
						onPress={() => setIsCreateSheetOpen(true)}
					>
						New
					</Button>
				</View>

				<PlayerAwareScrollView
					style={styles.playlistList}
					showsVerticalScrollIndicator={false}
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
								onSelect={() => onSelectPlaylist(playlist.id)}
							/>
						))
					)}
				</PlayerAwareScrollView>
			</ManagedBottomSheet>

			<CreatePlaylistSheet
				isOpen={isCreateSheetOpen}
				onClose={() => setIsCreateSheetOpen(false)}
				onCreated={handlePlaylistCreated}
			/>
		</>
	);
}

const styles = StyleSheet.create({
	header: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		marginBottom: 16,
	},
	title: {
		fontWeight: '600',
	},
	playlistList: {
		flex: 1,
	},
	playlistItem: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 16,
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
});
