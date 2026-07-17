/**
 * DASH Manifest Builder
 *
 * Builds a minimal audio-only DASH manifest for a single adaptive format.
 * googlevideo only serves bounded Range requests of up to ~1 MiB (mid-2026
 * anti-scraping change), so progressive streaming of the full file is no
 * longer possible. A SegmentBase manifest lets the player fetch the stream
 * in small indexed chunks, which still pass.
 *
 * The manifest is persisted as a local .mpd file: Media3 cannot resolve
 * DASH manifests from data: URIs (opaque, non-hierarchical).
 */

import * as FileSystem from 'expo-file-system/legacy';
import { getLogger } from '@shared/services/logger';
import { ensureCacheDirectory, getCachedFilePath } from './cache-operations';

const logger = getLogger('YouTubeMusic:DashManifest');

export interface ByteRange {
	readonly start: number;
	readonly end: number;
}

export interface AudioDashManifestParams {
	readonly url: string;
	readonly mimeType: string;
	readonly bitrate: number;
	readonly durationMs: number;
	readonly initRange: ByteRange;
	readonly indexRange: ByteRange;
	readonly audioSamplingRate?: number;
}

function escapeXml(value: string): string {
	return value
		.replaceAll('&', '&amp;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;')
		.replaceAll('"', '&quot;')
		.replaceAll("'", '&apos;');
}

function extractCodecs(mimeType: string): string | null {
	const match = mimeType.match(/codecs="([^"]+)"/);
	return match ? match[1] : null;
}

function extractBaseMimeType(mimeType: string): string {
	return mimeType.split(';')[0].trim();
}

function buildRepresentation(params: AudioDashManifestParams, codecs: string): string {
	const samplingRate =
		params.audioSamplingRate !== undefined
			? ` audioSamplingRate="${params.audioSamplingRate}"`
			: '';

	return (
		`<Representation id="audio-1" mimeType="${escapeXml(extractBaseMimeType(params.mimeType))}"` +
		` codecs="${escapeXml(codecs)}" bandwidth="${params.bitrate}"${samplingRate}>` +
		`<BaseURL>${escapeXml(params.url)}</BaseURL>` +
		`<SegmentBase indexRange="${params.indexRange.start}-${params.indexRange.end}" indexRangeExact="true">` +
		`<Initialization range="${params.initRange.start}-${params.initRange.end}"/>` +
		'</SegmentBase>' +
		'</Representation>'
	);
}

/**
 * Build the DASH manifest XML for a single audio representation.
 * Returns null when the mime type carries no codec information.
 */
export function buildAudioDashManifestXml(params: AudioDashManifestParams): string | null {
	const codecs = extractCodecs(params.mimeType);
	if (!codecs) return null;

	const duration = `PT${(params.durationMs / 1000).toFixed(3)}S`;

	return (
		'<?xml version="1.0" encoding="UTF-8"?>' +
		'<MPD xmlns="urn:mpeg:dash:schema:mpd:2011"' +
		' profiles="urn:mpeg:dash:profile:isoff-on-demand:2011"' +
		` type="static" mediaPresentationDuration="${duration}" minBufferTime="PT1.5S">` +
		`<Period duration="${duration}">` +
		'<AdaptationSet contentType="audio" subsegmentAlignment="true" subsegmentStartsWithSAP="1">' +
		buildRepresentation(params, codecs) +
		'</AdaptationSet>' +
		'</Period>' +
		'</MPD>'
	);
}

/**
 * Build and persist the DASH manifest for a video, returning the local
 * .mpd file path, or null when the manifest cannot be built or written.
 */
export async function writeAudioDashManifest(
	videoId: string,
	params: AudioDashManifestParams
): Promise<string | null> {
	const xml = buildAudioDashManifestXml(params);
	if (!xml) return null;

	try {
		await ensureCacheDirectory();
		const manifestPath = getCachedFilePath(videoId, 'mpd');
		await FileSystem.writeAsStringAsync(manifestPath, xml);
		return manifestPath;
	} catch (error) {
		logger.warn(
			`Failed to write DASH manifest: ${error instanceof Error ? error.message : String(error)}`
		);
		return null;
	}
}
