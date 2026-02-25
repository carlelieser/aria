/**
 * URL Validator
 *
 * Determines whether the DASH playback provider can handle a given URL
 * by checking for DASH manifest or HLS stream indicators.
 */

import type { ContentType } from 'expo-video';

export function isDashUrl(url: string): boolean {
	return url.startsWith('data:application/dash+xml');
}

export function isHlsUrl(url: string): boolean {
	return url.includes('/manifest/hls') || url.endsWith('.m3u8');
}

export function canHandleUrl(url: string): boolean {
	return isDashUrl(url) || isHlsUrl(url);
}

export function resolveContentType(url: string): ContentType {
	return isHlsUrl(url) ? 'hls' : 'dash';
}
