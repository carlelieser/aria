/**
 * Track Mapper
 *
 * Converts app Track entities to react-native-track-player Track format.
 */

import type { Track as RNTPTrack } from 'react-native-track-player';
import type { Track } from '@domain/entities/track';
import { getArtistNames, getArtworkUrl } from '@domain/entities/track';

export function mapToRNTPTrack(
	track: Track,
	streamUrl: string,
	headers?: Record<string, string>
): RNTPTrack {
	return {
		id: track.id.value,
		url: streamUrl,
		title: track.title,
		artist: getArtistNames(track),
		album: track.album?.name,
		artwork: getArtworkUrl(track),
		duration: track.duration.totalSeconds,
		headers: headers,
	};
}

export function mapToRNTPTracks(
	tracks: Track[],
	getStreamUrl: (track: Track) => string,
	getHeaders?: (track: Track) => Record<string, string> | undefined
): RNTPTrack[] {
	return tracks.map((track) => mapToRNTPTrack(track, getStreamUrl(track), getHeaders?.(track)));
}
