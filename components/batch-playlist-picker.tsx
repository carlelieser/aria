/**
 * BatchPlaylistPicker Component
 *
 * Bottom sheet for selecting a playlist to add multiple tracks to.
 * Supports creating new playlists inline.
 */

import { useCallback, useMemo, useRef, useEffect, useState } from 'react';
import { View, Pressable, StyleSheet, ScrollView } from 'react-native';
import { Text, TextInput, Button } from 'react-native-paper';
import BottomSheet, {
	BottomSheetBackdrop,
	BottomSheetView,
	type BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';
import type { BottomSheetMethods } from '@gorhom/bottom-sheet/lib/typescript/types';
import { Portal } from '@rn-primitives/portal';
import { ListMusicIcon, PlusIcon, CheckIcon, XIcon } from 'lucide-react-native';
import { Icon } from '@/components/ui/icon';
import { useLibraryStore, usePlaylists } from '@/src/application/state/library-store';
import { createPlaylist } from '@/src/domain/entities/playlist';
import { useAppTheme, M3Shapes } from '@/lib/theme';
import type { Playlist } from '@/src/domain/entities/playlist';

interface BatchPlaylistPickerProps {
	isOpen: boolean;
	onClose: () => void;
	onSelectPlaylist: (playlistId: string) => void;
	selectedCount: number;
}

interface PlaylistItemProps {
	playlist: Playlist;
	onSelect: () => void;
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
				<Text variant="bodyMedium" style={{ color: colors.onSurface }}>
					{playlist.name}
				</Text>
				<Text variant="bodySmall" style={{ color: colors.onSurfaceVariant }}>
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
	const sheetRef = useRef<BottomSheetMethods>(null);
	const snapPoints = useMemo(() => ['60%'], []);

	const [isCreating, setIsCreating] = useState(false);
	const [newPlaylistName, setNewPlaylistName] = useState('');

	const playlists = usePlaylists();
	const addPlaylist = useLibraryStore((state) => state.addPlaylist);

	useEffect(() => {
		if (isOpen) {
			sheetRef.current?.snapToIndex(0);
		} else {
			setIsCreating(false);
			setNewPlaylistName('');
		}
	}, [isOpen]);

	const handleSheetChanges = useCallback(
		(index: number) => {
			if (index === -1) {
				onClose();
			}
		},
		[onClose]
	);

	const renderBackdrop = useCallback(
		(props: BottomSheetBackdropProps) => (
			<BottomSheetBackdrop
				{...props}
				disappearsOnIndex={-1}
				appearsOnIndex={0}
				opacity={0.5}
				pressBehavior="close"
			/>
		),
		[]
	);

	const handleCreatePlaylist = useCallback(() => {
		const name = newPlaylistName.trim();
		if (!name) return;

		const playlist = createPlaylist({ name });
		addPlaylist(playlist);
		setIsCreating(false);
		setNewPlaylistName('');
		onSelectPlaylist(playlist.id);
	}, [newPlaylistName, addPlaylist, onSelectPlaylist]);

	const handleCancelCreate = useCallback(() => {
		setIsCreating(false);
		setNewPlaylistName('');
	}, []);

	if (!isOpen) {
		return null;
	}

	return (
		<Portal name="batch-playlist-picker">
			<BottomSheet
				ref={sheetRef}
				index={0}
				snapPoints={snapPoints}
				enablePanDownToClose
				backdropComponent={renderBackdrop}
				onChange={handleSheetChanges}
				backgroundStyle={[
					styles.background,
					{ backgroundColor: colors.surfaceContainerHigh },
				]}
				handleIndicatorStyle={[
					styles.handleIndicator,
					{ backgroundColor: colors.outlineVariant },
				]}
			>
				<BottomSheetView style={styles.content}>
					<View style={styles.header}>
						<Text
							variant="titleMedium"
							style={[styles.title, { color: colors.onSurface }]}
						>
							Add {selectedCount} tracks to playlist
						</Text>
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
									icon={() => (
										<Icon as={XIcon} size={16} color={colors.onSurface} />
									)}
									onPress={handleCancelCreate}
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

					<ScrollView style={styles.playlistList} showsVerticalScrollIndicator={false}>
						{playlists.length === 0 && !isCreating ? (
							<View style={styles.emptyState}>
								<Icon
									as={ListMusicIcon}
									size={48}
									color={colors.onSurfaceVariant}
								/>
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
									onSelect={() => onSelectPlaylist(playlist.id)}
								/>
							))
						)}
					</ScrollView>
				</BottomSheetView>
			</BottomSheet>
		</Portal>
	);
}

const styles = StyleSheet.create({
	background: {
		borderTopLeftRadius: M3Shapes.extraLarge,
		borderTopRightRadius: M3Shapes.extraLarge,
	},
	handleIndicator: {
		width: 36,
		height: 4,
		borderRadius: 2,
	},
	content: {
		flex: 1,
		paddingHorizontal: 24,
	},
	header: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		marginBottom: 16,
	},
	title: {
		fontWeight: '600',
	},
	createForm: {
		gap: 12,
		marginBottom: 16,
	},
	createActions: {
		flexDirection: 'row',
		gap: 8,
	},
	createButton: {
		flex: 1,
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
	emptyState: {
		paddingVertical: 48,
		alignItems: 'center',
	},
});
