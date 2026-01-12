import { getLogger } from '@shared/services/logger';

const logger = getLogger('YouTubeMusic:HLS:Parser');

export interface HlsParseResult {
	readonly initSegmentUrl: string | null;
	readonly segmentUrls: readonly string[];
	readonly baseUrl: string;
}

async function fetchManifestText(
	url: string,
	headers: Record<string, string>
): Promise<string | null> {
	const response = await fetch(url, { headers });
	if (!response.ok) {
		logger.warn(`Failed to fetch manifest: ${response.status}`);
		return null;
	}
	return response.text();
}

function findAudioPlaylistUrl(lines: readonly string[], manifestUrl: string): string | null {
	// First, look for #EXT-X-MEDIA:TYPE=AUDIO lines (audio-only streams)
	for (const line of lines) {
		const trimmed = line.trim();
		if (trimmed.startsWith('#EXT-X-MEDIA:') && trimmed.includes('TYPE=AUDIO')) {
			const uriMatch = trimmed.match(/URI="([^"]+)"/);
			if (uriMatch) {
				const url = uriMatch[1].startsWith('http')
					? uriMatch[1]
					: new URL(uriMatch[1], manifestUrl).href;
				logger.debug('Found audio-only stream from EXT-X-MEDIA');
				return url;
			}
		}
	}

	// Fallback: check if this is a direct segment playlist (no variants)
	for (const line of lines) {
		if (line.trim().startsWith('#EXTINF:')) {
			logger.debug('Manifest is a direct segment playlist');
			return manifestUrl;
		}
	}

	return null;
}

function parseInitSegment(line: string, baseUrl: string): string | null {
	if (!line.startsWith('#EXT-X-MAP:')) {
		return null;
	}

	const uriMatch = line.match(/URI="([^"]+)"/);
	if (!uriMatch) {
		return null;
	}

	const url = uriMatch[1].startsWith('http') ? uriMatch[1] : baseUrl + uriMatch[1];
	logger.debug(`Found init segment: ${url.substring(0, 50)}...`);
	return url;
}

function parseSegmentUrl(line: string, baseUrl: string): string | null {
	const trimmed = line.trim();
	if (!trimmed || trimmed.startsWith('#')) {
		return null;
	}
	return trimmed.startsWith('http') ? trimmed : baseUrl + trimmed;
}

function parseSegmentPlaylist(
	text: string,
	baseUrl: string
): { initSegmentUrl: string | null; segmentUrls: string[] } {
	const lines = text.split('\n');
	const segmentUrls: string[] = [];
	let initSegmentUrl: string | null = null;

	for (const line of lines) {
		const trimmed = line.trim();

		const initUrl = parseInitSegment(trimmed, baseUrl);
		if (initUrl) {
			initSegmentUrl = initUrl;
			continue;
		}

		const segmentUrl = parseSegmentUrl(trimmed, baseUrl);
		if (segmentUrl) {
			segmentUrls.push(segmentUrl);
		}
	}

	return { initSegmentUrl, segmentUrls };
}

export async function parseHlsManifest(
	manifestUrl: string,
	fetchHeaders: Record<string, string>
): Promise<HlsParseResult | null> {
	const manifestText = await fetchManifestText(manifestUrl, fetchHeaders);
	if (!manifestText) {
		return null;
	}

	logger.debug(`Manifest length: ${manifestText.length}`);

	const lines = manifestText.split('\n');
	const audioPlaylistUrl = findAudioPlaylistUrl(lines, manifestUrl);

	if (!audioPlaylistUrl) {
		logger.warn('No audio playlist found in manifest');
		return null;
	}

	logger.debug(`Using audio playlist: ${audioPlaylistUrl.substring(0, 50)}...`);

	// Fetch the audio segment playlist if different from master
	let segmentPlaylistText = manifestText;
	if (audioPlaylistUrl !== manifestUrl) {
		const text = await fetchManifestText(audioPlaylistUrl, fetchHeaders);
		if (!text) {
			return null;
		}
		segmentPlaylistText = text;
	}

	const baseUrl = audioPlaylistUrl.substring(0, audioPlaylistUrl.lastIndexOf('/') + 1);
	const { initSegmentUrl, segmentUrls } = parseSegmentPlaylist(segmentPlaylistText, baseUrl);

	if (segmentUrls.length === 0) {
		logger.warn('No segments found in playlist');
		return null;
	}

	return { initSegmentUrl, segmentUrls, baseUrl };
}
