/**
 * ArtistListItem Component
 *
 * Displays an artist in a list format with circular artwork and name.
 * Uses M3 theming.
 */

import { memo, useCallback, useMemo } from 'react';
import { router } from 'expo-router';
import { User } from 'lucide-react-native';

import { getBestArtwork } from '@/src/domain/value-objects/artwork';
import { formatListeners } from '@/src/domain/utils/formatting';
import type { Artist } from '@/src/domain/entities/artist';
import { MediaListItem } from './media-list-item';

interface ArtistListItemBaseProps {
	readonly onPress?: () => void;
}

interface ArtistListItemWithArtist extends ArtistListItemBaseProps {
	readonly artist: Artist;
	readonly id?: never;
	readonly name?: never;
	readonly artworkUrl?: never;
	readonly trackCount?: never;
}

interface ArtistListItemWithProps extends ArtistListItemBaseProps {
	readonly artist?: never;
	readonly id: string;
	readonly name: string;
	readonly artworkUrl?: string;
	readonly trackCount?: number;
}

export type ArtistListItemProps = ArtistListItemWithArtist | ArtistListItemWithProps;

export const ArtistListItem = memo(function ArtistListItem(props: ArtistListItemProps) {
	const isArtistObject = 'artist' in props && props.artist !== undefined;

	const id = isArtistObject ? props.artist.id : props.id;
	const name = isArtistObject ? props.artist.name : props.name;

	const artworkUrl = useMemo(() => {
		if (isArtistObject) {
			return getBestArtwork(props.artist.artwork, 300)?.url;
		}
		return props.artworkUrl;
	}, [isArtistObject, props]);

	const subtitle = useMemo(() => {
		if (isArtistObject) {
			const artist = props.artist;
			const listeners = formatListeners(artist.monthlyListeners);
			const genres = artist.genres?.slice(0, 2).join(', ');
			const details = [genres, listeners].filter(Boolean).join(' · ');
			return details ? `Artist · ${details}` : 'Artist';
		}
		if (props.trackCount !== undefined) {
			return `Artist · ${props.trackCount} ${props.trackCount === 1 ? 'track' : 'tracks'}`;
		}
		return 'Artist';
	}, [isArtistObject, props]);

	const { onPress } = props;
	const handlePress = useCallback(() => {
		if (onPress) {
			onPress();
		} else {
			router.push(`/artist/${id}`);
		}
	}, [onPress, id]);

	return (
		<MediaListItem
			title={name}
			subtitle={subtitle}
			onPress={handlePress}
			artwork={{
				url: artworkUrl,
				shape: 'circular',
				fallbackIcon: User,
				recyclingKey: id,
			}}
		/>
	);
});
