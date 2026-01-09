import { View, FlatList, TouchableOpacity } from "react-native";
import { Icon } from '@/components/ui/icon';
import { Text } from "@/components/ui/text";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button } from "@/components/ui/button";
import {
	SearchIcon,
	MusicIcon,
	ListMusicIcon,
	UsersIcon,
	SettingsIcon,
	type LucideIcon
} from "lucide-react-native";
import { router } from "expo-router";
import { useState, useMemo } from "react";
import { Image } from "expo-image";
import { useTracks, usePlaylists, useIsLibraryLoading } from "@/src/application/state/library-store";
import { TrackListItem } from "@/components/track-list-item";
import {
	TrackListSkeleton,
	PlaylistListSkeleton,
	ArtistListSkeleton,
} from "@/components/skeletons";
import type { Track } from "@/src/domain/entities/track";
import type { Playlist } from "@/src/domain/entities/playlist";

const chips = ["playlists", "artists", "songs"] as const;
type ChipType = typeof chips[number];

interface UniqueArtist {
	id: string;
	name: string;
	trackCount: number;
	artworkUrl?: string;
}

export default function HomeScreen() {
	const [selected, setSelected] = useState<ChipType>("playlists");
	const tracks = useTracks();
	const playlists = usePlaylists();
	const isLoading = useIsLibraryLoading();

	// Extract unique artists from tracks
	const artists = useMemo<UniqueArtist[]>(() => {
		const artistMap = new Map<string, UniqueArtist>();

		tracks.forEach(track => {
			track.artists.forEach(artist => {
				const existing = artistMap.get(artist.id);
				if (existing) {
					existing.trackCount += 1;
				} else {
					// Get artwork from the first track with this artist
					const artworkUrl = track.artwork?.[0]?.url;
					artistMap.set(artist.id, {
						id: artist.id,
						name: artist.name,
						trackCount: 1,
						artworkUrl,
					});
				}
			});
		});

		return Array.from(artistMap.values()).sort((a, b) =>
			a.name.localeCompare(b.name)
		);
	}, [tracks]);

	const handleSettingsPress = () => {
		router.navigate("/settings" as const);
	};

	return (
		<SafeAreaView className={"bg-background flex-1"}>
			{/* Header */}
			<View className={"flex-row items-center justify-between p-4"}>
				<Text className="text-2xl font-bold">Library</Text>
				<View className={"flex-row gap-1"}>
					<Button variant={"ghost"} size={"icon"} onPress={() => router.navigate("/search")}>
						<Icon as={SearchIcon}/>
					</Button>
					<Button variant={"ghost"} size={"icon"} onPress={handleSettingsPress}>
						<Icon as={SettingsIcon}/>
					</Button>
				</View>
			</View>

			{/* Filter Chips */}
			<View className={"flex-row gap-2 px-4 mb-4"}>
				{chips.map((chip) => {
					const variant = chip === selected ? 'default' : 'secondary';
					return (
						<Button key={chip} variant={variant} onPress={() => setSelected(chip)}>
							<Text className={"capitalize"}>{chip}</Text>
						</Button>
					);
				})}
			</View>

			{/* Content */}
			<View className="flex-1 px-4">
				{selected === "songs" && (
					<SongsList tracks={tracks} isLoading={isLoading} />
				)}
				{selected === "playlists" && (
					<PlaylistsList playlists={playlists} isLoading={isLoading} />
				)}
				{selected === "artists" && (
					<ArtistsList artists={artists} isLoading={isLoading} />
				)}
			</View>
		</SafeAreaView>
	);
}

// Songs List Component
function SongsList({ tracks, isLoading }: { tracks: Track[]; isLoading: boolean }) {
	if (isLoading) {
		return <TrackListSkeleton count={8} />;
	}

	if (tracks.length === 0) {
		return (
			<EmptyState
				icon={MusicIcon}
				title="No songs yet"
				description="Search for music or add local files to build your library"
			/>
		);
	}

	return (
		<FlatList
			data={tracks}
			keyExtractor={(item) => item.id.value}
			renderItem={({ item }) => <TrackListItem track={item} />}
			showsVerticalScrollIndicator={false}
		/>
	);
}

// Playlists List Component
function PlaylistsList({ playlists, isLoading }: { playlists: Playlist[]; isLoading: boolean }) {
	if (isLoading) {
		return <PlaylistListSkeleton count={6} />;
	}

	if (playlists.length === 0) {
		return (
			<EmptyState
				icon={ListMusicIcon}
				title="No playlists yet"
				description="Create a playlist to organize your favorite tracks"
			/>
		);
	}

	return (
		<FlatList
			data={playlists}
			keyExtractor={(item) => item.id}
			renderItem={({ item }) => <PlaylistItem playlist={item} />}
			showsVerticalScrollIndicator={false}
		/>
	);
}

// Artists List Component
function ArtistsList({ artists, isLoading }: { artists: UniqueArtist[]; isLoading: boolean }) {
	if (isLoading) {
		return <ArtistListSkeleton count={6} />;
	}

	if (artists.length === 0) {
		return (
			<EmptyState
				icon={UsersIcon}
				title="No artists yet"
				description="Add some music to see your favorite artists here"
			/>
		);
	}

	return (
		<FlatList
			data={artists}
			keyExtractor={(item) => item.id}
			renderItem={({ item }) => <ArtistItem artist={item} />}
			showsVerticalScrollIndicator={false}
		/>
	);
}

// Playlist Item Component
function PlaylistItem({ playlist }: { playlist: Playlist }) {
	const trackCount = playlist.tracks.length;
	const artworkUrl = playlist.artwork?.[0]?.url;

	return (
		<TouchableOpacity
			className="flex flex-row items-center w-full gap-4 py-4"
			activeOpacity={0.7}
		>
			{artworkUrl ? (
				<Image
					source={{ uri: artworkUrl }}
					style={{
						width: 56,
						height: 56,
						borderRadius: 8,
					}}
					contentFit="cover"
					transition={200}
				/>
			) : (
				<View
					className="bg-muted items-center justify-center"
					style={{ width: 56, height: 56, borderRadius: 8 }}
				>
					<Icon as={ListMusicIcon} className="text-muted-foreground" />
				</View>
			)}

			<View className="flex flex-col gap-1 flex-1">
				<Text numberOfLines={1} className="font-medium">
					{playlist.name}
				</Text>
				<Text variant="muted" numberOfLines={1}>
					{trackCount} {trackCount === 1 ? 'track' : 'tracks'}
				</Text>
			</View>
		</TouchableOpacity>
	);
}

// Artist Item Component
function ArtistItem({ artist }: { artist: UniqueArtist }) {
	return (
		<TouchableOpacity
			className="flex flex-row items-center w-full gap-4 py-4"
			activeOpacity={0.7}
		>
			{artist.artworkUrl ? (
				<Image
					source={{ uri: artist.artworkUrl }}
					style={{
						width: 56,
						height: 56,
						borderRadius: 28,
					}}
					contentFit="cover"
					transition={200}
				/>
			) : (
				<View
					className="bg-muted items-center justify-center"
					style={{ width: 56, height: 56, borderRadius: 28 }}
				>
					<Icon as={UsersIcon} className="text-muted-foreground" />
				</View>
			)}

			<View className="flex flex-col gap-1 flex-1">
				<Text numberOfLines={1} className="font-medium">
					{artist.name}
				</Text>
				<Text variant="muted" numberOfLines={1}>
					{artist.trackCount} {artist.trackCount === 1 ? 'track' : 'tracks'}
				</Text>
			</View>
		</TouchableOpacity>
	);
}

// Empty State Component
export function EmptyState({
	icon: IconComponent,
	title,
	description
}: {
	icon: LucideIcon;
	title: string;
	description: string;
}) {
	return (
		<View className="flex-1 items-center justify-center py-16">
			<View className="bg-muted rounded-full p-6 mb-4">
				<Icon as={IconComponent} size={48} className="text-muted-foreground" />
			</View>
			<Text className="text-xl font-semibold mb-2">{title}</Text>
			<Text variant="muted" className="text-center px-8">
				{description}
			</Text>
		</View>
	);
}
