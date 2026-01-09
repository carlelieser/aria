import type Innertube from 'youtubei.js/react-native';
import * as FileSystem from 'expo-file-system/legacy';
import type { StreamOptions } from '@plugins/core/interfaces/audio-source-provider';
import type { TrackId } from '@domain/value-objects/track-id';
import type { AudioStream } from '@domain/value-objects/audio-stream';
import { createAudioStream } from '@domain/value-objects/audio-stream';
import type { Result } from '@shared/types/result';
import { ok, err } from '@shared/types/result';
import { getLogger } from '@shared/services/logger';
import type { ClientManager } from './client';

const logger = getLogger('YouTubeMusic:Streaming');

const CACHE_DIR = 'audio/';

async function checkCache(videoId: string): Promise<string | null> {
	const cacheDir = FileSystem.cacheDirectory + CACHE_DIR;
	const cachedFilePath = cacheDir + `${videoId}.m4a`;
	const fileInfo = await FileSystem.getInfoAsync(cachedFilePath);

	if (fileInfo.exists && 'size' in fileInfo && (fileInfo.size as number) > 10000) {
		logger.debug(`Using cached file: ${cachedFilePath}`);
		return cachedFilePath;
	}

	if (fileInfo.exists) {
		await FileSystem.deleteAsync(cachedFilePath, { idempotent: true });
	}

	return null;
}

async function tryHlsStream(
	client: Innertube,
	videoId: string,
	clientType: 'IOS' | 'TV'
): Promise<string | null> {
	try {
		const videoInfo = await client.getInfo(videoId, { client: clientType });
		return videoInfo.streaming_data?.hls_manifest_url ?? null;
	} catch {
		return null;
	}
}

async function downloadToCache(
	url: string,
	videoId: string,
	headers?: Record<string, string>
): Promise<string | null> {
	const cacheDir = FileSystem.cacheDirectory + CACHE_DIR;
	const cachedFilePath = cacheDir + `${videoId}.m4a`;

	await FileSystem.makeDirectoryAsync(cacheDir, { intermediates: true }).catch(() => {});

	const finalHeaders = {
		Accept: '*/*',
		Origin: 'https://www.youtube.com',
		Referer: 'https://www.youtube.com/',
		'User-Agent': 'Mozilla/5.0 (ChromiumStylePlatform) Cobalt/Version',
		...headers,
	};

	logger.debug(`Downloading with headers: ${Object.keys(finalHeaders).join(', ')}`);

	const downloadResult = await FileSystem.downloadAsync(url, cachedFilePath, {
		headers: finalHeaders,
	});

	if (downloadResult.status === 200 || downloadResult.status === 206) {
		logger.debug(`Audio cached to: ${cachedFilePath}`);
		return cachedFilePath;
	}

	logger.warn(`Cache download failed with status: ${downloadResult.status}`);
	return null;
}

async function downloadHlsToCache(
	manifestUrl: string,
	videoId: string
): Promise<string | null> {
	const cacheDir = FileSystem.cacheDirectory + CACHE_DIR;
	const cachedFilePath = cacheDir + `${videoId}.aac`;
	const tempDir = cacheDir + `${videoId}_segments/`;

	await FileSystem.makeDirectoryAsync(tempDir, { intermediates: true }).catch(() => {});

	try {
		logger.debug('Fetching HLS manifest...');

		// Fetch the master manifest
		const manifestResponse = await fetch(manifestUrl);
		if (!manifestResponse.ok) {
			logger.warn(`Failed to fetch manifest: ${manifestResponse.status}`);
			return null;
		}

		const manifestText = await manifestResponse.text();
		logger.debug(`Manifest length: ${manifestText.length}`);

		// Parse manifest to find audio playlist URL
		const lines = manifestText.split('\n');
		let audioPlaylistUrl: string | null = null;
		let bestBandwidth = 0;

		for (let i = 0; i < lines.length; i++) {
			const line = lines[i].trim();

			// Look for audio-only streams or highest quality stream
			if (line.startsWith('#EXT-X-STREAM-INF:')) {
				const bandwidthMatch = line.match(/BANDWIDTH=(\d+)/);
				const bandwidth = bandwidthMatch ? parseInt(bandwidthMatch[1], 10) : 0;

				// Get the URL on the next line
				const nextLine = lines[i + 1]?.trim();
				if (nextLine && !nextLine.startsWith('#')) {
					// Prefer audio-only streams, otherwise take highest bandwidth
					if (line.includes('AUDIO') || bandwidth > bestBandwidth) {
						bestBandwidth = bandwidth;
						audioPlaylistUrl = nextLine.startsWith('http')
							? nextLine
							: new URL(nextLine, manifestUrl).href;
					}
				}
			}

			// Direct segment playlist (no variants)
			if (line.startsWith('#EXTINF:') && !audioPlaylistUrl) {
				audioPlaylistUrl = manifestUrl;
				break;
			}
		}

		if (!audioPlaylistUrl) {
			logger.warn('No audio playlist found in manifest');
			return null;
		}

		logger.debug(`Using audio playlist: ${audioPlaylistUrl.substring(0, 50)}...`);

		// Fetch the audio segment playlist if different from master
		let segmentPlaylistText = manifestText;
		if (audioPlaylistUrl !== manifestUrl) {
			const segmentPlaylistResponse = await fetch(audioPlaylistUrl);
			if (!segmentPlaylistResponse.ok) {
				logger.warn(`Failed to fetch segment playlist: ${segmentPlaylistResponse.status}`);
				return null;
			}
			segmentPlaylistText = await segmentPlaylistResponse.text();
		}

		// Parse segment URLs
		const segmentLines = segmentPlaylistText.split('\n');
		const segmentUrls: string[] = [];
		const baseUrl = audioPlaylistUrl.substring(0, audioPlaylistUrl.lastIndexOf('/') + 1);

		for (const line of segmentLines) {
			const trimmed = line.trim();
			if (trimmed && !trimmed.startsWith('#')) {
				const segmentUrl = trimmed.startsWith('http')
					? trimmed
					: baseUrl + trimmed;
				segmentUrls.push(segmentUrl);
			}
		}

		if (segmentUrls.length === 0) {
			logger.warn('No segments found in playlist');
			return null;
		}

		logger.debug(`Found ${segmentUrls.length} segments to download`);

		// Download all segments
		const segmentPaths: string[] = [];
		for (let i = 0; i < segmentUrls.length; i++) {
			const segmentPath = `${tempDir}segment_${i.toString().padStart(4, '0')}.ts`;
			const result = await FileSystem.downloadAsync(segmentUrls[i], segmentPath);

			if (result.status !== 200 && result.status !== 206) {
				logger.warn(`Failed to download segment ${i}: ${result.status}`);
				// Clean up and fail
				await FileSystem.deleteAsync(tempDir, { idempotent: true }).catch(() => {});
				return null;
			}

			segmentPaths.push(segmentPath);

			if ((i + 1) % 10 === 0) {
				logger.debug(`Downloaded ${i + 1}/${segmentUrls.length} segments`);
			}
		}

		logger.debug('All segments downloaded, concatenating...');

		// Concatenate all segments into final file
		// Read all segments and write to final file
		let totalSize = 0;
		const chunks: string[] = [];

		for (const segmentPath of segmentPaths) {
			const content = await FileSystem.readAsStringAsync(segmentPath, {
				encoding: FileSystem.EncodingType.Base64,
			});
			chunks.push(content);
			const info = await FileSystem.getInfoAsync(segmentPath);
			if (info.exists && 'size' in info) {
				totalSize += info.size as number;
			}
		}

		// Write concatenated file
		await FileSystem.writeAsStringAsync(
			cachedFilePath,
			chunks.join(''),
			{ encoding: FileSystem.EncodingType.Base64 }
		);

		// Clean up temp segments
		await FileSystem.deleteAsync(tempDir, { idempotent: true }).catch(() => {});

		// Verify file
		const finalInfo = await FileSystem.getInfoAsync(cachedFilePath);
		if (!finalInfo.exists || !('size' in finalInfo) || (finalInfo.size as number) < 10000) {
			logger.warn('Concatenated file is too small or missing');
			await FileSystem.deleteAsync(cachedFilePath, { idempotent: true }).catch(() => {});
			return null;
		}

		logger.debug(`HLS download complete: ${cachedFilePath} (${finalInfo.size} bytes)`);
		return cachedFilePath;
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		logger.warn(`HLS download failed: ${message}`);
		// Clean up
		await FileSystem.deleteAsync(tempDir, { idempotent: true }).catch(() => {});
		await FileSystem.deleteAsync(cachedFilePath, { idempotent: true }).catch(() => {});
		return null;
	}
}

async function tryAdaptiveFormat(
	client: Innertube,
	videoId: string,
	quality: string,
	clientType: 'TV' | 'IOS' | 'ANDROID' = 'TV'
): Promise<AudioStream | null> {
	try {
		logger.debug(`Trying adaptive format with ${clientType} client...`);
		const videoInfo = await client.getInfo(videoId, { client: clientType });

		if (!videoInfo.streaming_data) {
			logger.debug(`No streaming_data available from ${clientType} client`);
			return null;
		}

		const format = videoInfo.chooseFormat({ type: 'audio', quality: 'best' });

		if (!format) {
			logger.debug(`No audio format found from ${clientType} client`);
			return null;
		}

		logger.debug(`Found format: itag=${format.itag}, mime=${format.mime_type}, bitrate=${format.bitrate}`);

		// Try to get URL - some formats have direct URL, others need deciphering
		let url: string | undefined;

		if (format.url) {
			logger.debug('Format has direct URL');
			url = format.url;
		} else if (format.decipher) {
			logger.debug('Deciphering URL...');
			url = await format.decipher(client.session.player);
		}

		if (url) {
			logger.debug(`Got URL for ${clientType} client (length: ${url.length})`);
			return createAudioStream({
				url,
				format: 'm4a',
				quality: quality as 'low' | 'medium' | 'high',
				headers: {
					Accept: '*/*',
					Origin: 'https://www.youtube.com',
					Referer: 'https://www.youtube.com/',
					'User-Agent': 'Mozilla/5.0 (ChromiumStylePlatform) Cobalt/Version',
					Range: 'bytes=0-',
				},
			});
		}

		logger.debug(`Failed to get URL from ${clientType} client`);
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		logger.debug(`Adaptive format error with ${clientType} client: ${message}`);
	}
	return null;
}

export interface StreamingOperations {
	getStreamUrl(trackId: TrackId, options?: StreamOptions): Promise<Result<AudioStream, Error>>;
}

export function createStreamingOperations(clientManager: ClientManager): StreamingOperations {
	return {
		async getStreamUrl(
			trackId: TrackId,
			options?: StreamOptions
		): Promise<Result<AudioStream, Error>> {
			try {
				const videoId = trackId.sourceId;
				const quality = options?.quality ?? 'high';
				const preferDownloadable = options?.preferDownloadable ?? false;

				logger.debug('Getting stream URL for video:', videoId);

				const cachedPath = await checkCache(videoId);
				if (cachedPath) {
					return ok(
						createAudioStream({
							url: cachedPath,
							format: 'm4a',
							quality,
						})
					);
				}

				const client = await clientManager.createFreshClient();

				// When preferDownloadable is set (for downloads), try adaptive format first
				// HLS manifests can't be saved as files, so we need direct URLs for downloads
				if (preferDownloadable) {
					logger.debug('Preferring downloadable format...');

					// Try multiple client types for better compatibility
					const clientTypes: Array<'TV' | 'ANDROID' | 'IOS'> = ['TV', 'ANDROID', 'IOS'];
					for (const clientType of clientTypes) {
						const adaptiveStream = await tryAdaptiveFormat(client, videoId, quality, clientType);
						if (adaptiveStream) {
							// Try to download and cache the file for reliability
							logger.debug('Attempting to cache downloaded audio...');
							const cachedFile = await downloadToCache(
								adaptiveStream.url,
								videoId,
								adaptiveStream.headers
							);
							if (cachedFile) {
								return ok(
									createAudioStream({
										url: cachedFile,
										format: 'm4a',
										quality,
									})
								);
							}
							// If caching failed, still return the stream URL
							logger.debug('Caching failed, returning stream URL directly');
							return ok(adaptiveStream);
						}
					}

					// Last resort: try downloading from HLS stream
					logger.debug('Adaptive formats failed, trying HLS download...');
					const hlsUrl = await tryHlsStream(client, videoId, 'IOS')
						|| await tryHlsStream(client, videoId, 'TV');

					if (hlsUrl) {
						logger.debug('Found HLS manifest, downloading segments...');
						const cachedFile = await downloadHlsToCache(hlsUrl, videoId);
						if (cachedFile) {
							return ok(
								createAudioStream({
									url: cachedFile,
									format: 'aac',
									quality,
								})
							);
						}
						logger.debug('HLS download failed');
					}

					logger.debug('All download attempts failed');
					return err(new Error('No downloadable audio format available for this track'));
				}

				// For streaming playback, prefer HLS as it handles adaptive bitrate better
				logger.debug('Trying IOS client for HLS stream...');
				const iosHls = await tryHlsStream(client, videoId, 'IOS');
				if (iosHls) {
					logger.debug('Found HLS manifest from IOS client');
					return ok(
						createAudioStream({
							url: iosHls,
							format: 'aac',
							quality,
						})
					);
				}

				logger.debug('Trying TV client...');
				const tvHls = await tryHlsStream(client, videoId, 'TV');
				if (tvHls) {
					logger.debug('Found HLS manifest from TV client');
					return ok(
						createAudioStream({
							url: tvHls,
							format: 'aac',
							quality,
						})
					);
				}

				// Fallback: try adaptive format and cache it
				const fallbackClients: Array<'TV' | 'ANDROID' | 'IOS'> = ['TV', 'ANDROID', 'IOS'];
				for (const clientType of fallbackClients) {
					const adaptiveStream = await tryAdaptiveFormat(client, videoId, quality, clientType);
					if (adaptiveStream) {
						const cachedFile = await downloadToCache(
							adaptiveStream.url,
							videoId,
							adaptiveStream.headers
						);
						if (cachedFile) {
							return ok(
								createAudioStream({
									url: cachedFile,
									format: 'm4a',
									quality,
								})
							);
						}
					}
				}

				return err(
					new Error('No streaming data available - HLS and adaptive formats failed')
				);
			} catch (error) {
				logger.error('getStreamUrl error', error instanceof Error ? error : undefined);
				return err(
					error instanceof Error
						? error
						: new Error(`Failed to get stream URL: ${String(error)}`)
				);
			}
		},
	};
}
