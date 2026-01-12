/**
 * ArtistListItem Component
 *
 * Displays an artist in a list format with circular artwork and name.
 * Uses M3 theming.
 */

import { memo, useCallback, useMemo } from 'react';
import { User } from 'lucide-react-native';

import { getBestArtwork } from '@/src/domain/value-objects/artwork';
import type { Artist } from '@/src/domain/entities/artist';
import { MediaListItem } from './media-list/media-list-item';

interface ArtistListItemBaseProps {
	onPress?: () => void;
}

interface ArtistListItemWithArtist extends ArtistListItemBaseProps {
	artist: Artist;
	id?: never;
	name?: never;
	artworkUrl?: never;
	trackCount?: never;
}

interface ArtistListItemWithProps extends ArtistListItemBaseProps {
	artist?: never;
	id: string;
	name: string;
	artworkUrl?: string;
	trackCount?: number;
}

export type ArtistListItemProps = ArtistListItemWithArtist | ArtistListItemWithProps;

function formatListeners(count: number | undefined): string | null {
	if (!count) return null;
	if (count >= 1_000_000) {
		return `${(count / 1_000_000).toFixed(1)}M listeners`;
	}
	if (count >= 1_000) {
		return `${(count / 1_000).toFixed(0)}K listeners`;
	}
	return `${count} listeners`;
}

export const ArtistListItem = memo(function ArtistListItem(props: ArtistListItemProps) {
	const isArtistObject = 'artist' in props && props.artist !== undefined;

	const id = isArtistObject ? props.artist.id : props.id;
	const name = isArtistObject ? props.artist.name : props.name;

	const artworkUrl = useMemo(() => {
		if (isArtistObject) {
			return getBestArtwork(props.artist.artwork, 48)?.url;
		}
		return props.artworkUrl;
	}, [isArtistObject, props]);

	const subtitle = useMemo(() => {
		if (isArtistObject) {
			const artist = props.artist;
			const listeners = formatListeners(artist.monthlyListeners);
			const genres = artist.genres?.slice(0, 2).join(', ');
			return [genres, listeners].filter(Boolean).join(' · ') || undefined;
		}
		if (props.trackCount !== undefined) {
			return `${props.trackCount} ${props.trackCount === 1 ? 'track' : 'tracks'}`;
		}
		return undefined;
	}, [isArtistObject, props]);

	const { onPress } = props;
	const handlePress = useCallback(() => {
		onPress?.();
	}, [onPress]);

	return (
		<MediaListItem
			title={name}
			subtitle={subtitle}
			onPress={props.onPress ? handlePress : undefined}
			artwork={{
				url: artworkUrl,
				shape: 'circular',
				fallbackIcon: User,
				recyclingKey: id,
			}}
		/>
	);
});
