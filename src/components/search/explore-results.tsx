import { MusicIcon, DiscIcon, UsersIcon } from 'lucide-react-native';
import { SelectableTrackListItem } from '@/src/components/media-list/selectable-track-list-item';
import { AlbumListItem } from '@/src/components/media-list/album-list-item';
import { ArtistListItem } from '@/src/components/media-list/artist-list-item';
import { ResultSection } from './result-section';
import type { Track } from '@/src/domain/entities/track';
import type { Album } from '@/src/domain/entities/album';
import type { Artist } from '@/src/domain/entities/artist';

interface ExploreResultsProps {
	readonly tracks: Track[];
	readonly albums: Album[];
	readonly artists: Artist[];
	readonly isSelectionMode: boolean;
	readonly selectedTrackIds: Set<string>;
	readonly onLongPress: (track: Track) => void;
	readonly onSelectionToggle: (track: Track) => void;
}

export function ExploreResults({
	tracks,
	albums,
	artists,
	isSelectionMode,
	selectedTrackIds,
	onLongPress,
	onSelectionToggle,
}: ExploreResultsProps) {
	return (
		<>
			{tracks.length > 0 && (
				<ResultSection title="Songs" icon={MusicIcon}>
					{tracks.map((track, index) => (
						<SelectableTrackListItem
							key={track.id.value}
							track={track}
							source="search"
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

			{albums.length > 0 && (
				<ResultSection title="Albums" icon={DiscIcon}>
					{albums.map((album) => (
						<AlbumListItem key={album.id.value} album={album} />
					))}
				</ResultSection>
			)}

			{artists.length > 0 && (
				<ResultSection title="Artists" icon={UsersIcon}>
					{artists.map((artist) => (
						<ArtistListItem key={artist.id} artist={artist} />
					))}
				</ResultSection>
			)}
		</>
	);
}
