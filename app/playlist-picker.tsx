/**
 * PlaylistPickerScreen
 *
 * Select or create a playlist to add a track to.
 * Uses M3 theming.
 */

import { useState } from 'react';
import { View, ScrollView, Pressable, StyleSheet } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeftIcon, PlusIcon, ListMusicIcon, CheckIcon, XIcon } from 'lucide-react-native';
import { Text, IconButton, Button, TextInput, Surface } from 'react-native-paper';
import { Icon } from '@/components/ui/icon';
import { useLibraryStore, usePlaylists, useTrack } from '@/src/application/state/library-store';
import { createPlaylist } from '@/src/domain/entities/playlist';
import { useToast } from '@/hooks/use-toast';
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
					variant="bodyMedium"
					style={{ color: trackAlreadyIn ? colors.onSurfaceVariant : colors.onSurface }}
				>
					{playlist.name}
				</Text>
				<Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>
					{playlist.tracks.length} {playlist.tracks.length === 1 ? 'track' : 'tracks'}
				</Text>
			</View>
			{trackAlreadyIn && (
				<View style={styles.addedIndicator}>
					<Icon as={CheckIcon} size={16} color={colors.onSurfaceVariant} />
					<Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>
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

	const [isCreating, setIsCreating] = useState(false);
	const [newPlaylistName, setNewPlaylistName] = useState('');

	const track = useTrack(trackId);
	const playlists = usePlaylists();
	const addPlaylist = useLibraryStore((state) => state.addPlaylist);
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

	const handleCreatePlaylist = () => {
		const name = newPlaylistName.trim();
		if (!name) {
			error('Invalid name', 'Please enter a playlist name');
			return;
		}

		const playlist = createPlaylist({ name });
		addPlaylist(playlist);

		if (track) {
			addTrackToPlaylist(playlist.id, track);
			success(`Created "${name}"`, `Added "${track.title}" to your new playlist`);
		} else {
			success(`Created "${name}"`, 'Your new playlist is ready');
		}

		setIsCreating(false);
		setNewPlaylistName('');
		router.back();
	};

	const isTrackInPlaylist = (playlist: Playlist): boolean => {
		if (!trackId) return false;
		return playlist.tracks.some((pt) => pt.track.id.value === trackId);
	};

	return (
		<View style={[styles.container, { backgroundColor: colors.background }]}>
			<View
				style={[
					styles.header,
					{ backgroundColor: colors.surfaceContainerHigh, paddingTop: insets.top + 16 },
				]}
			>
				<View style={styles.headerRow}>
					<View style={styles.headerTitleRow}>
						<IconButton
							icon={() => (
								<Icon as={ChevronLeftIcon} size={22} color={colors.onSurface} />
							)}
							onPress={() => router.back()}
							style={styles.backButton}
						/>
						<Text
							variant="titleLarge"
							style={{ color: colors.onSurface, fontWeight: '700' }}
						>
							Add to Playlist
						</Text>
					</View>
					{!isCreating && (
						<Button
							mode="text"
							icon={() => <Icon as={PlusIcon} size={18} color={colors.primary} />}
							onPress={() => setIsCreating(true)}
						>
							New
						</Button>
					)}
				</View>

				{track && (
					<Surface
						style={[styles.trackPreview, { backgroundColor: `${colors.background}80` }]}
					>
						<Text
							variant="bodyMedium"
							numberOfLines={1}
							style={{ color: colors.onSurface, fontWeight: '500' }}
						>
							{track.title}
						</Text>
						<Text
							variant="bodySmall"
							numberOfLines={1}
							style={{ color: colors.onSurfaceVariant }}
						>
							{track.artists.map((a) => a.name).join(', ')}
						</Text>
					</Surface>
				)}

				{isCreating && (
					<View style={styles.createForm}>
						<TextInput
							value={newPlaylistName}
							onChangeText={setNewPlaylistName}
							placeholder="Playlist name"
							mode="outlined"
							autoFocus
							onSubmitEditing={handleCreatePlaylist}
						/>
						<View style={styles.createActions}>
							<Button
								mode="outlined"
								icon={() => <Icon as={XIcon} size={16} color={colors.onSurface} />}
								onPress={() => {
									setIsCreating(false);
									setNewPlaylistName('');
								}}
								style={styles.createButton}
							>
								Cancel
							</Button>
							<Button
								mode="contained"
								icon={() => (
									<Icon as={CheckIcon} size={16} color={colors.onPrimary} />
								)}
								onPress={handleCreatePlaylist}
								disabled={!newPlaylistName.trim()}
								style={styles.createButton}
							>
								Create
							</Button>
						</View>
					</View>
				)}
			</View>

			<ScrollView
				contentContainerStyle={[
					styles.scrollContent,
					{ paddingBottom: insets.bottom + 80 },
				]}
			>
				{playlists.length === 0 && !isCreating ? (
					<View style={styles.emptyState}>
						<Icon as={ListMusicIcon} size={48} color={colors.onSurfaceVariant} />
						<Text
							variant="bodyMedium"
							style={{ color: colors.onSurfaceVariant, marginTop: 16 }}
						>
							No playlists yet
						</Text>
						<Button mode="text" onPress={() => setIsCreating(true)}>
							Create your first playlist
						</Button>
					</View>
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
			</ScrollView>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
	},
	header: {
		paddingHorizontal: 16,
		paddingBottom: 16,
		borderBottomLeftRadius: 24,
		borderBottomRightRadius: 24,
		gap: 16,
	},
	headerRow: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
	},
	headerTitleRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12,
	},
	backButton: {
		opacity: 0.7,
	},
	trackPreview: {
		padding: 12,
		borderRadius: 12,
	},
	createForm: {
		gap: 12,
	},
	createActions: {
		flexDirection: 'row',
		gap: 8,
	},
	createButton: {
		flex: 1,
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
	emptyState: {
		paddingVertical: 48,
		alignItems: 'center',
		paddingHorizontal: 16,
	},
});
