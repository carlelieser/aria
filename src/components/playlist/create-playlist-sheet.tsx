/**
 * CreatePlaylistSheet Component
 *
 * Bottom sheet for creating a new playlist.
 * Used by both the playlist picker screen and batch playlist picker.
 */

import { useCallback, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Button } from 'react-native-paper';
import { BottomSheetTextInput } from '@gorhom/bottom-sheet';
import { CheckIcon, XIcon } from 'lucide-react-native';
import { Icon } from '@/src/components/ui/icon';
import { ManagedBottomSheet } from '@/src/components/ui/managed-bottom-sheet';
import { useLibraryStore } from '@/src/application/state/library-store';
import { createPlaylist } from '@/src/domain/entities/playlist';
import { useAppTheme } from '@/lib/theme';

interface CreatePlaylistSheetProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly onCreated: (playlistId: string, playlistName: string) => void;
}

export function CreatePlaylistSheet({ isOpen, onClose, onCreated }: CreatePlaylistSheetProps) {
	const { colors } = useAppTheme();
	const [name, setName] = useState('');
	const addPlaylist = useLibraryStore((state) => state.addPlaylist);

	const reset = useCallback(() => {
		setName('');
	}, []);

	const handleClose = useCallback(() => {
		reset();
		onClose();
	}, [onClose, reset]);

	const handleCreate = useCallback(() => {
		const trimmed = name.trim();
		if (!trimmed) return;

		const playlist = createPlaylist({ name: trimmed });
		addPlaylist(playlist);
		reset();
		onCreated(playlist.id, trimmed);
	}, [name, addPlaylist, reset, onCreated]);

	return (
		<ManagedBottomSheet
			portalName={'create-playlist'}
			isOpen={isOpen}
			onClose={handleClose}
			snapPoints={['35%']}
			keyboardBehavior={'extend'}
			keyboardBlurBehavior={'restore'}
		>
			<View style={styles.form}>
				<Text
					variant={'titleMedium'}
					style={{ color: colors.onSurface, fontWeight: '600' }}
				>
					New Playlist
				</Text>
				<BottomSheetTextInput
					value={name}
					onChangeText={setName}
					placeholder={'Playlist name'}
					placeholderTextColor={colors.onSurfaceVariant}
					autoFocus
					onSubmitEditing={handleCreate}
					style={[
						styles.textInput,
						{
							color: colors.onSurface,
							borderColor: colors.outline,
							backgroundColor: colors.surfaceContainerLow,
						},
					]}
				/>
				<View style={styles.actions}>
					<Button
						mode={'outlined'}
						icon={({ color }) => <Icon as={XIcon} size={16} color={color} />}
						onPress={handleClose}
						style={styles.button}
					>
						Cancel
					</Button>
					<Button
						mode={'contained'}
						icon={({ color }) => <Icon as={CheckIcon} size={16} color={color} />}
						onPress={handleCreate}
						disabled={!name.trim()}
						style={styles.button}
					>
						Create
					</Button>
				</View>
			</View>
		</ManagedBottomSheet>
	);
}

const styles = StyleSheet.create({
	form: {
		gap: 16,
	},
	textInput: {
		fontSize: 16,
		paddingHorizontal: 16,
		paddingVertical: 12,
		borderWidth: 1,
		borderRadius: 12,
	},
	actions: {
		flexDirection: 'row',
		gap: 8,
	},
	button: {
		flex: 1,
	},
});
