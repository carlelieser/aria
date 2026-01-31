/**
 * PlaylistListItem Component
 *
 * Displays a playlist in a list format with artwork and track count.
 * Uses M3 theming.
 */

import { memo, useCallback, useMemo } from 'react';
import { router } from 'expo-router';
import { ListMusic } from 'lucide-react-native';

import { getBestArtwork } from '@/src/domain/value-objects/artwork';
import type { Playlist } from '@/src/domain/entities/playlist';
import { MediaListItem } from './media-list-item';

export interface PlaylistListItemProps {
	playlist: Playlist;
	onPress?: (playlist: Playlist) => void;
}

export const PlaylistListItem = memo(function PlaylistListItem({
	playlist,
	onPress,
}: PlaylistListItemProps) {
	const handlePress = useCallback(() => {
		if (onPress) {
			onPress(playlist);
		} else {
			router.push({
				pathname: '/playlist/[id]',
				params: { id: playlist.id },
			});
		}
	}, [onPress, playlist]);

	const artworkUrl = useMemo(() => {
		const playlistArtwork = getBestArtwork(playlist.artwork, 48);
		if (playlistArtwork?.url) return playlistArtwork.url;
		// Fall back to first track's artwork
		return playlist.tracks[0]?.track.artwork?.[0]?.url;
	}, [playlist.artwork, playlist.tracks]);

	const trackCount = playlist.tracks.length;
	const subtitle = `${trackCount} ${trackCount === 1 ? 'track' : 'tracks'}`;

	return (
		<MediaListItem
			title={playlist.name}
			subtitle={subtitle}
			onPress={handlePress}
			artwork={{
				url: artworkUrl,
				shape: 'rounded',
				fallbackIcon: ListMusic,
				recyclingKey: playlist.id,
			}}
		/>
	);
});
