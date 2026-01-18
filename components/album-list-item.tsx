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
import { useAlbumStore } from '@/src/application/state/album-store';
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

	const subtitle = useMemo(() => {
		const artistText = isAlbumObject
			? formatArtistNames(props.album.artists)
			: props.artistName;
		return `Album · ${artistText}`;
	}, [isAlbumObject, props]);

	const artworkUrl = useMemo(() => {
		if (isAlbumObject) {
			return getBestArtwork(props.album.artwork, 48)?.url;
		}
		return props.artworkUrl;
	}, [isAlbumObject, props]);

	const tertiaryText = useMemo(() => {
		if (isAlbumObject && props.album.trackCount) {
			return `${props.album.trackCount} tracks`;
		}
		if (!isAlbumObject && props.trackCount !== undefined) {
			return `${props.trackCount} ${props.trackCount === 1 ? 'track' : 'tracks'}`;
		}
		return undefined;
	}, [isAlbumObject, props]);

	const { onPress } = props;
	const handlePress = useCallback(() => {
		if (onPress) {
			onPress();
		} else {
			// Cache album data before navigation so detail page has it immediately
			if (isAlbumObject) {
				useAlbumStore.getState().setAlbumPreview(props.album);
			}
			router.push(`/album/${id}`);
		}
	}, [onPress, id, isAlbumObject, props]);

	return (
		<MediaListItem
			title={name}
			subtitle={subtitle}
			tertiaryText={tertiaryText}
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
