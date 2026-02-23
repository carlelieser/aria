/**
 * Track Mapper
 *
 * Converts app Track entities to react-native-track-player Track format.
 */

import type { Track as RNTPTrack } from 'react-native-track-player';
import type { Track } from '@domain/entities/track';
import { getArtistNames, getArtworkUrl } from '@domain/entities/track';

const EXTENSION_MIME_MAP: Record<string, string> = {
	m4a: 'audio/mp4',
	mp4: 'audio/mp4',
	mp3: 'audio/mpeg',
	ts: 'video/MP2T',
	webm: 'audio/webm',
	ogg: 'audio/ogg',
	opus: 'audio/ogg',
	flac: 'audio/flac',
	wav: 'audio/wav',
	aac: 'audio/aac',
	m3u8: 'application/x-mpegURL',
};

function getContentTypeFromUrl(url: string): string | undefined {
	const extensionMatch = url.match(/\.([a-zA-Z0-9]+)(?:\?|$)/);
	if (!extensionMatch) return undefined;
	return EXTENSION_MIME_MAP[extensionMatch[1].toLowerCase()];
}

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
		artworkHeaders: headers,
		contentType: getContentTypeFromUrl(streamUrl),
	};
}

export function mapToRNTPTracks(
	tracks: Track[],
	getStreamUrl: (track: Track) => string,
	getHeaders?: (track: Track) => Record<string, string> | undefined
): RNTPTrack[] {
	return tracks.map((track) => mapToRNTPTrack(track, getStreamUrl(track), getHeaders?.(track)));
}
