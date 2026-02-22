import { MusicIcon, ListMusicIcon, DiscIcon, UsersIcon } from 'lucide-react-native';
import { SelectableTrackListItem } from '@/src/components/media-list/selectable-track-list-item';
import { AlbumListItem } from '@/src/components/media-list/album-list-item';
import { ArtistListItem } from '@/src/components/media-list/artist-list-item';
import { PlaylistListItem } from '@/src/components/media-list';
import { ResultSection } from './result-section';
import type { Track } from '@/src/domain/entities/track';
import type { Playlist } from '@/src/domain/entities/playlist';
import type { UniqueAlbum, UniqueArtist } from '@/src/application/state/library-store';

interface SectionOverflow {
	readonly totalCount: number;
	readonly onShowAll: () => void;
}

interface LibraryResultsProps {
	readonly tracks: Track[];
	readonly playlists: Playlist[];
	readonly albums: UniqueAlbum[];
	readonly artists: UniqueArtist[];
	readonly isSelectionMode: boolean;
	readonly selectedTrackIds: Set<string>;
	readonly onLongPress: (track: Track) => void;
	readonly onSelectionToggle: (track: Track) => void;
	readonly tracksOverflow?: SectionOverflow;
	readonly playlistsOverflow?: SectionOverflow;
	readonly albumsOverflow?: SectionOverflow;
	readonly artistsOverflow?: SectionOverflow;
}

export function LibraryResults({
	tracks,
	playlists,
	albums,
	artists,
	isSelectionMode,
	selectedTrackIds,
	onLongPress,
	onSelectionToggle,
	tracksOverflow,
	playlistsOverflow,
	albumsOverflow,
	artistsOverflow,
}: LibraryResultsProps) {
	return (
		<>
			{tracks.length > 0 && (
				<ResultSection
					title={'Songs'}
					icon={MusicIcon}
					totalCount={tracksOverflow?.totalCount}
					onShowAll={tracksOverflow?.onShowAll}
				>
					{tracks.map((track, index) => (
						<SelectableTrackListItem
							key={track.id.value}
							track={track}
							source={'library'}
							isSelectionMode={isSelectionMode}
							isSelected={selectedTrackIds.has(track.id.value)}
							onLongPress={onLongPress}
							onSelectionToggle={onSelectionToggle}
							queue={tracks}
							queueIndex={index}
						/>
					))}
				</ResultSection>
			)}

			{playlists.length > 0 && (
				<ResultSection
					title={'Playlists'}
					icon={ListMusicIcon}
					totalCount={playlistsOverflow?.totalCount}
					onShowAll={playlistsOverflow?.onShowAll}
				>
					{playlists.map((playlist) => (
						<PlaylistListItem key={playlist.id} playlist={playlist} />
					))}
				</ResultSection>
			)}

			{albums.length > 0 && (
				<ResultSection
					title={'Albums'}
					icon={DiscIcon}
					totalCount={albumsOverflow?.totalCount}
					onShowAll={albumsOverflow?.onShowAll}
				>
					{albums.map((album) => (
						<AlbumListItem
							key={album.id}
							id={album.id}
							name={album.name}
							artistName={album.artistName ?? 'Unknown Artist'}
							artworkUrl={album.artworkUrl}
							trackCount={album.trackCount}
						/>
					))}
				</ResultSection>
			)}

			{artists.length > 0 && (
				<ResultSection
					title={'Artists'}
					icon={UsersIcon}
					totalCount={artistsOverflow?.totalCount}
					onShowAll={artistsOverflow?.onShowAll}
				>
					{artists.map((artist) => (
						<ArtistListItem
							key={artist.id}
							id={artist.id}
							name={artist.name}
							artworkUrl={artist.artworkUrl}
							trackCount={artist.trackCount}
						/>
					))}
				</ResultSection>
			)}
		</>
	);
}
