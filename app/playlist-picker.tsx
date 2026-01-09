import { useState } from 'react';
import { View, ScrollView, Pressable, TextInput } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeftIcon, PlusIcon, ListMusicIcon, CheckIcon, XIcon } from 'lucide-react-native';

import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { useLibraryStore, usePlaylists, useTrack } from '@/src/application/state/library-store';
import { createPlaylist } from '@/src/domain/entities/playlist';
import { useToast } from '@/hooks/use-toast';
import type { Playlist } from '@/src/domain/entities/playlist';

interface PlaylistItemProps {
	playlist: Playlist;
	onSelect: () => void;
	trackAlreadyIn: boolean;
}

function PlaylistItem({ playlist, onSelect, trackAlreadyIn }: PlaylistItemProps) {
	return (
		<Pressable
			className="flex-row items-center gap-4 p-4 rounded-xl active:bg-secondary"
			onPress={onSelect}
			disabled={trackAlreadyIn}
		>
			<View className="w-12 h-12 rounded-lg bg-secondary items-center justify-center">
				<Icon as={ListMusicIcon} size={24} className="text-muted-foreground" />
			</View>
			<View className="flex-1">
				<Text className={trackAlreadyIn ? 'text-muted-foreground' : ''}>
					{playlist.name}
				</Text>
				<Text variant="muted" className="text-sm">
					{playlist.tracks.length} {playlist.tracks.length === 1 ? 'track' : 'tracks'}
				</Text>
			</View>
			{trackAlreadyIn && (
				<View className="flex-row items-center gap-1">
					<Icon as={CheckIcon} size={16} className="text-muted-foreground" />
					<Text variant="muted" className="text-sm">
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
		<View className="flex-1 bg-background">
			{}
			<View
				className="px-4 pb-4 bg-secondary rounded-b-3xl"
				style={{ paddingTop: insets.top + 16 }}
			>
				<View className="flex-row items-center justify-between">
					<View className="flex-row items-center gap-3">
						<Button
							className="opacity-50"
							size="icon"
							variant="secondary"
							onPress={() => router.back()}
						>
							<Icon as={ChevronLeftIcon} />
						</Button>
						<Text className="text-xl font-bold">Add to Playlist</Text>
					</View>
					{!isCreating && (
						<Button variant="ghost" size="sm" onPress={() => setIsCreating(true)}>
							<Icon as={PlusIcon} size={18} className="mr-1" />
							<Text>New</Text>
						</Button>
					)}
				</View>

				{}
				{track && (
					<View className="mt-4 p-3 bg-background/50 rounded-xl">
						<Text className="font-medium" numberOfLines={1}>
							{track.title}
						</Text>
						<Text variant="muted" className="text-sm" numberOfLines={1}>
							{track.artists.map((a) => a.name).join(', ')}
						</Text>
					</View>
				)}

				{}
				{isCreating && (
					<View className="mt-4 gap-3">
						<Input
							value={newPlaylistName}
							onChangeText={setNewPlaylistName}
							placeholder="Playlist name"
							autoFocus
							onSubmitEditing={handleCreatePlaylist}
						/>
						<View className="flex-row gap-2">
							<Button
								variant="outline"
								className="flex-1"
								onPress={() => {
									setIsCreating(false);
									setNewPlaylistName('');
								}}
							>
								<Icon as={XIcon} size={16} className="mr-1" />
								<Text>Cancel</Text>
							</Button>
							<Button
								className="flex-1"
								onPress={handleCreatePlaylist}
								disabled={!newPlaylistName.trim()}
							>
								<Icon as={CheckIcon} size={16} className="mr-1" />
								<Text className="text-primary-foreground">Create</Text>
							</Button>
						</View>
					</View>
				)}
			</View>

			{}
			<ScrollView
				contentContainerClassName="py-2"
				contentContainerStyle={{ paddingBottom: insets.bottom + 80 }}
			>
				{playlists.length === 0 && !isCreating ? (
					<View className="py-12 items-center px-4">
						<Icon as={ListMusicIcon} size={48} className="text-muted-foreground mb-4" />
						<Text variant="muted" className="text-center">
							No playlists yet
						</Text>
						<Button variant="link" onPress={() => setIsCreating(true)}>
							<Text className="text-primary">Create your first playlist</Text>
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
