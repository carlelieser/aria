/**
 * AlbumListItem Component
 *
 * Displays an album in a list format with artwork, name, and artist info.
 * Uses M3 theming.
 */

import { memo, useCallback, useMemo } from 'react';
import { router } from 'expo-router';
import { Disc } from 'lucide-react-native';

import { getBestArtwork } from '@/src/domain/value-objects/artwork';
import { formatArtistNames } from '@/src/domain/entities/artist';
import type { Album } from '@/src/domain/entities/album';
import { MediaListItem } from './media-list/media-list-item';

interface AlbumListItemBaseProps {
	onPress?: () => void;
}

interface AlbumListItemWithAlbum extends AlbumListItemBaseProps {
	album: Album;
	id?: never;
	name?: never;
	artistName?: never;
	artworkUrl?: never;
	trackCount?: never;
}

interface AlbumListItemWithProps extends AlbumListItemBaseProps {
	album?: never;
	id: string;
	name: string;
	artistName: string;
	artworkUrl?: string;
	trackCount?: number;
}

export type AlbumListItemProps = AlbumListItemWithAlbum | AlbumListItemWithProps;

export const AlbumListItem = memo(function AlbumListItem(props: AlbumListItemProps) {
	const isAlbumObject = 'album' in props && props.album !== undefined;

	const id = isAlbumObject ? props.album.id.value : props.id;
	const name = isAlbumObject ? props.album.name : props.name;

	const artistNames = useMemo(() => {
		if (isAlbumObject) {
			return formatArtistNames(props.album.artists);
		}
		return props.artistName;
	}, [isAlbumObject, props]);

	const artworkUrl = useMemo(() => {
		if (isAlbumObject) {
			return getBestArtwork(props.album.artwork, 48)?.url;
		}
		return props.artworkUrl;
	}, [isAlbumObject, props]);

	const albumInfo = useMemo(() => {
		if (isAlbumObject) {
			const album = props.album;
			return [
				album.albumType
					? album.albumType.charAt(0).toUpperCase() + album.albumType.slice(1)
					: null,
				album.trackCount ? `${album.trackCount} tracks` : null,
			]
				.filter(Boolean)
				.join(' · ');
		}
		if (props.trackCount !== undefined) {
			return `${props.trackCount} ${props.trackCount === 1 ? 'track' : 'tracks'}`;
		}
		return undefined;
	}, [isAlbumObject, props]);

	const { onPress } = props;
	const handlePress = useCallback(() => {
		if (onPress) {
			onPress();
		} else {
			router.push(`/album/${id}`);
		}
	}, [onPress, id]);

	return (
		<MediaListItem
			title={name}
			subtitle={artistNames}
			tertiaryText={albumInfo}
			onPress={handlePress}
			artwork={{
				url: artworkUrl,
				shape: 'rounded',
				fallbackIcon: Disc,
				recyclingKey: id,
			}}
		/>
	);
});
