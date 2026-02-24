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
import { MediaListItem } from './media-list-item';

interface AlbumListItemBaseProps {
	readonly onPress?: () => void;
}

interface AlbumListItemWithAlbum extends AlbumListItemBaseProps {
	readonly album: Album;
	readonly id?: never;
	readonly name?: never;
	readonly artistName?: never;
	readonly artworkUrl?: never;
	readonly trackCount?: never;
}

interface AlbumListItemWithProps extends AlbumListItemBaseProps {
	readonly album?: never;
	readonly id: string;
	readonly name: string;
	readonly artistName: string;
	readonly artworkUrl?: string;
	readonly trackCount?: number;
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
			return getBestArtwork(props.album.artwork, 300)?.url;
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
