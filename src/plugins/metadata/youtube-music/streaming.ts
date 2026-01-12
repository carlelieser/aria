import type InnertubeClient from 'youtubei.js/react-native';
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
	client: InnertubeClient,
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

const DOWNLOAD_TIMEOUT_MS = 60000; // 60 seconds timeout for downloads

async function downloadWithTimeout(
	url: string,
	filePath: string,
	headers: Record<string, string>,
	timeoutMs: number
): Promise<FileSystem.FileSystemDownloadResult | null> {
	return new Promise((resolve) => {
		const timeoutId = setTimeout(() => {
			logger.warn(`Download timed out after ${timeoutMs}ms`);
			resolve(null);
		}, timeoutMs);

		FileSystem.downloadAsync(url, filePath, { headers })
			.then((result) => {
				clearTimeout(timeoutId);
				resolve(result);
			})
			.catch((error) => {
				clearTimeout(timeoutId);
				logger.warn(`Download error: ${error instanceof Error ? error.message : String(error)}`);
				resolve(null);
			});
	});
}

async function downloadToCache(
	url: string,
	videoId: string,
	headers?: Record<string, string>,
	cookies?: string,
	expectedSize?: number
): Promise<string | null> {
	const cacheDir = FileSystem.cacheDirectory + CACHE_DIR;
	const cachedFilePath = cacheDir + `${videoId}.m4a`;

	await FileSystem.makeDirectoryAsync(cacheDir, { intermediates: true }).catch(() => {});

	const finalHeaders: Record<string, string> = {
		Accept: '*/*',
		Origin: 'https://www.youtube.com',
		Referer: 'https://www.youtube.com/',
		'User-Agent': 'Mozilla/5.0 (ChromiumStylePlatform) Cobalt/Version',
		// Request full file with Range header - YouTube servers often require this
		Range: expectedSize ? `bytes=0-${expectedSize - 1}` : 'bytes=0-',
		...headers,
	};

	if (cookies) {
		finalHeaders['Cookie'] = cookies;
		logger.debug('Including authentication cookies in download request');
	}

	logger.debug(`Downloading with headers: ${Object.keys(finalHeaders).join(', ')}`);
	logger.debug(`URL length: ${url.length}, expected size: ${expectedSize ?? 'unknown'}`);

	const downloadResult = await downloadWithTimeout(
		url,
		cachedFilePath,
		finalHeaders,
		DOWNLOAD_TIMEOUT_MS
	);

	if (!downloadResult) {
		logger.warn('Download failed or timed out');
		await FileSystem.deleteAsync(cachedFilePath, { idempotent: true }).catch(() => {});
		return null;
	}

	// Accept both 200 (full response) and 206 (range response) as success
	// We send Range headers so 206 is expected for successful downloads
	if (downloadResult.status === 200 || downloadResult.status === 206) {
		logger.debug(`Download completed with status: ${downloadResult.status}`);

		// Verify file size
		const fileInfo = await FileSystem.getInfoAsync(cachedFilePath);
		if (!fileInfo.exists || !('size' in fileInfo)) {
			logger.warn('Downloaded file does not exist or has no size info');
			await FileSystem.deleteAsync(cachedFilePath, { idempotent: true }).catch(() => {});
			return null;
		}

		const actualSize = fileInfo.size as number;

		if (expectedSize && actualSize < expectedSize * 0.95) {
			logger.warn(`Download incomplete: got ${actualSize} bytes, expected ${expectedSize}`);
			await FileSystem.deleteAsync(cachedFilePath, { idempotent: true }).catch(() => {});
			return null;
		}

		if (actualSize < 10000) {
			logger.warn(`Downloaded file too small: ${actualSize} bytes`);
			await FileSystem.deleteAsync(cachedFilePath, { idempotent: true }).catch(() => {});
			return null;
		}

		logger.debug(`Audio cached successfully: ${actualSize} bytes to ${cachedFilePath}`);
		return cachedFilePath;
	}

	logger.warn(`Cache download failed with status: ${downloadResult.status}`);
	await FileSystem.deleteAsync(cachedFilePath, { idempotent: true }).catch(() => {});
	return null;
}

interface HlsParseResult {
	initSegmentUrl: string | null;
	segmentUrls: string[];
	baseUrl: string;
}

async function parseHlsManifest(
	manifestUrl: string,
	fetchHeaders: Record<string, string>
): Promise<HlsParseResult | null> {
	const manifestResponse = await fetch(manifestUrl, { headers: fetchHeaders });
	if (!manifestResponse.ok) {
		logger.warn(`Failed to fetch manifest: ${manifestResponse.status}`);
		return null;
	}

	const manifestText = await manifestResponse.text();
	logger.debug(`Manifest length: ${manifestText.length}`);

	// Parse manifest to find audio-only playlist URL
	const lines = manifestText.split('\n');
	let audioPlaylistUrl: string | null = null;

	// First, look for #EXT-X-MEDIA:TYPE=AUDIO lines (audio-only streams)
	for (const line of lines) {
		const trimmed = line.trim();
		if (trimmed.startsWith('#EXT-X-MEDIA:') && trimmed.includes('TYPE=AUDIO')) {
			const uriMatch = trimmed.match(/URI="([^"]+)"/);
			if (uriMatch) {
				audioPlaylistUrl = uriMatch[1].startsWith('http')
					? uriMatch[1]
					: new URL(uriMatch[1], manifestUrl).href;
				logger.debug('Found audio-only stream from EXT-X-MEDIA');
				break;
			}
		}
	}

	// Fallback: check if this is a direct segment playlist (no variants)
	if (!audioPlaylistUrl) {
		for (const line of lines) {
			if (line.trim().startsWith('#EXTINF:')) {
				audioPlaylistUrl = manifestUrl;
				logger.debug('Manifest is a direct segment playlist');
				break;
			}
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
		const segmentPlaylistResponse = await fetch(audioPlaylistUrl, {
			headers: fetchHeaders,
		});
		if (!segmentPlaylistResponse.ok) {
			logger.warn(`Failed to fetch segment playlist: ${segmentPlaylistResponse.status}`);
			return null;
		}
		segmentPlaylistText = await segmentPlaylistResponse.text();
	}

	// Parse segment URLs and find initialization segment (EXT-X-MAP)
	const segmentLines = segmentPlaylistText.split('\n');
	const segmentUrls: string[] = [];
	let initSegmentUrl: string | null = null;
	const baseUrl = audioPlaylistUrl.substring(0, audioPlaylistUrl.lastIndexOf('/') + 1);

	for (const line of segmentLines) {
		const trimmed = line.trim();

		if (trimmed.startsWith('#EXT-X-MAP:')) {
			const uriMatch = trimmed.match(/URI="([^"]+)"/);
			if (uriMatch) {
				initSegmentUrl = uriMatch[1].startsWith('http')
					? uriMatch[1]
					: baseUrl + uriMatch[1];
				logger.debug(`Found init segment: ${initSegmentUrl.substring(0, 50)}...`);
			}
		}

		if (trimmed && !trimmed.startsWith('#')) {
			const segmentUrl = trimmed.startsWith('http') ? trimmed : baseUrl + trimmed;
			segmentUrls.push(segmentUrl);
		}
	}

	if (segmentUrls.length === 0) {
		logger.warn('No segments found in playlist');
		return null;
	}

	return { initSegmentUrl, segmentUrls, baseUrl };
}

async function concatenateSegmentsToFile(
	initSegmentPath: string | null,
	segmentPaths: string[],
	outputPath: string
): Promise<boolean> {
	const allBytes: number[] = [];

	// Add init segment first (contains ftyp + moov atoms required for fMP4 playback)
	if (initSegmentPath) {
		const initB64 = await FileSystem.readAsStringAsync(initSegmentPath, {
			encoding: FileSystem.EncodingType.Base64,
		});
		const initBinary = atob(initB64);
		for (let i = 0; i < initBinary.length; i++) {
			allBytes.push(initBinary.charCodeAt(i));
		}
		logger.debug(`Added init segment: ${initBinary.length} bytes`);
	}

	// Add media segments
	for (const segmentPath of segmentPaths) {
		const b64Content = await FileSystem.readAsStringAsync(segmentPath, {
			encoding: FileSystem.EncodingType.Base64,
		});
		const binaryStr = atob(b64Content);
		for (let i = 0; i < binaryStr.length; i++) {
			allBytes.push(binaryStr.charCodeAt(i));
		}
	}

	logger.debug(`Total bytes from segments: ${allBytes.length}`);

	// Convert to Uint8Array
	const uint8 = new Uint8Array(allBytes.length);
	for (let i = 0; i < allBytes.length; i++) {
		uint8[i] = allBytes[i];
	}

	// Convert Uint8Array to base64 string
	let binary = '';
	const chunkSize = 8192;
	for (let i = 0; i < uint8.length; i += chunkSize) {
		const slice = uint8.subarray(i, Math.min(i + chunkSize, uint8.length));
		binary += String.fromCharCode.apply(null, Array.from(slice));
	}
	const finalB64 = btoa(binary);

	await FileSystem.writeAsStringAsync(outputPath, finalB64, {
		encoding: FileSystem.EncodingType.Base64,
	});

	// Verify file
	const finalInfo = await FileSystem.getInfoAsync(outputPath);
	return finalInfo.exists && 'size' in finalInfo && (finalInfo.size as number) > 10000;
}

// Minimum segments needed for immediate playback (~30 seconds at ~2s per segment)
const MIN_SEGMENTS_FOR_PLAYBACK = 15;

// Background download tracking
const backgroundDownloads = new Map<string, Promise<void>>();

async function downloadHlsToCache(
	manifestUrl: string,
	videoId: string,
	cookies?: string,
	forStreaming: boolean = false
): Promise<string | null> {
	const cacheDir = FileSystem.cacheDirectory + CACHE_DIR;
	const cachedFilePath = cacheDir + `${videoId}.m4a`;
	const partialFilePath = cacheDir + `${videoId}_partial.m4a`;
	const tempDir = cacheDir + `${videoId}_segments/`;

	await FileSystem.makeDirectoryAsync(tempDir, { intermediates: true }).catch(() => {});

	const fetchHeaders: Record<string, string> = {};
	if (cookies) {
		fetchHeaders['Cookie'] = cookies;
		logger.debug('Using authenticated HLS download with cookies');
	}

	try {
		logger.debug('Fetching HLS manifest...');

		const parsed = await parseHlsManifest(manifestUrl, fetchHeaders);
		if (!parsed) return null;

		const { initSegmentUrl, segmentUrls } = parsed;
		logger.debug(`Found ${segmentUrls.length} segments to download`);

		// Download initialization segment first if present
		let initSegmentPath: string | null = null;
		if (initSegmentUrl) {
			initSegmentPath = `${tempDir}init.mp4`;
			const initResult = await FileSystem.downloadAsync(initSegmentUrl, initSegmentPath, {
				headers: fetchHeaders,
			});
			if (initResult.status !== 200 && initResult.status !== 206) {
				logger.warn(`Failed to download init segment: ${initResult.status}`);
				await FileSystem.deleteAsync(tempDir, { idempotent: true }).catch(() => {});
				return null;
			}
			logger.debug('Init segment downloaded successfully');
		}

		// For streaming: download minimum segments, return immediately, continue in background
		if (forStreaming && segmentUrls.length > MIN_SEGMENTS_FOR_PLAYBACK) {
			const initialSegmentCount = Math.min(MIN_SEGMENTS_FOR_PLAYBACK, segmentUrls.length);
			logger.debug(`Streaming mode: downloading ${initialSegmentCount} segments for immediate playback`);

			// Download initial segments
			const initialSegmentPaths: string[] = [];
			for (let i = 0; i < initialSegmentCount; i++) {
				const segmentPath = `${tempDir}segment_${i.toString().padStart(4, '0')}.ts`;
				const result = await FileSystem.downloadAsync(segmentUrls[i], segmentPath, {
					headers: fetchHeaders,
				});

				if (result.status !== 200 && result.status !== 206) {
					logger.warn(`Failed to download segment ${i}: ${result.status}`);
					await FileSystem.deleteAsync(tempDir, { idempotent: true }).catch(() => {});
					return null;
				}
				initialSegmentPaths.push(segmentPath);
			}

			// Create partial file for immediate playback
			const partialSuccess = await concatenateSegmentsToFile(
				initSegmentPath,
				initialSegmentPaths,
				partialFilePath
			);

			if (!partialSuccess) {
				logger.warn('Failed to create partial file');
				await FileSystem.deleteAsync(tempDir, { idempotent: true }).catch(() => {});
				return null;
			}

			logger.debug(`Partial file ready for playback: ${partialFilePath}`);

			// Start background download for remaining segments
			if (!backgroundDownloads.has(videoId)) {
				const backgroundTask = (async () => {
					try {
						logger.debug(`Background: downloading remaining ${segmentUrls.length - initialSegmentCount} segments`);
						const allSegmentPaths = [...initialSegmentPaths];

						for (let i = initialSegmentCount; i < segmentUrls.length; i++) {
							const segmentPath = `${tempDir}segment_${i.toString().padStart(4, '0')}.ts`;
							const result = await FileSystem.downloadAsync(segmentUrls[i], segmentPath, {
								headers: fetchHeaders,
							});

							if (result.status !== 200 && result.status !== 206) {
								logger.warn(`Background: failed to download segment ${i}`);
								continue; // Continue with other segments
							}
							allSegmentPaths.push(segmentPath);

							if ((i + 1) % 20 === 0) {
								logger.debug(`Background: downloaded ${i + 1}/${segmentUrls.length} segments`);
							}
						}

						// Create full cached file
						const fullSuccess = await concatenateSegmentsToFile(
							initSegmentPath,
							allSegmentPaths,
							cachedFilePath
						);

						if (fullSuccess) {
							logger.debug(`Background: full file cached: ${cachedFilePath}`);
							// Clean up partial file
							await FileSystem.deleteAsync(partialFilePath, { idempotent: true }).catch(() => {});
						}

						// Clean up temp segments
						await FileSystem.deleteAsync(tempDir, { idempotent: true }).catch(() => {});
					} catch (error) {
						logger.warn(`Background download error: ${error instanceof Error ? error.message : String(error)}`);
					} finally {
						backgroundDownloads.delete(videoId);
					}
				})();

				backgroundDownloads.set(videoId, backgroundTask);
			}

			return partialFilePath;
		}

		// Full download mode (for offline downloads or short tracks)
		logger.debug('Full download mode: downloading all segments');
		const segmentPaths: string[] = [];
		for (let i = 0; i < segmentUrls.length; i++) {
			const segmentPath = `${tempDir}segment_${i.toString().padStart(4, '0')}.ts`;
			const result = await FileSystem.downloadAsync(segmentUrls[i], segmentPath, {
				headers: fetchHeaders,
			});

			if (result.status !== 200 && result.status !== 206) {
				logger.warn(`Failed to download segment ${i}: ${result.status}`);
				await FileSystem.deleteAsync(tempDir, { idempotent: true }).catch(() => {});
				return null;
			}

			segmentPaths.push(segmentPath);

			if ((i + 1) % 10 === 0) {
				logger.debug(`Downloaded ${i + 1}/${segmentUrls.length} segments`);
			}
		}

		logger.debug('All segments downloaded, concatenating...');

		const success = await concatenateSegmentsToFile(initSegmentPath, segmentPaths, cachedFilePath);

		// Clean up temp segments
		await FileSystem.deleteAsync(tempDir, { idempotent: true }).catch(() => {});

		if (!success) {
			logger.warn('Failed to create cached file');
			await FileSystem.deleteAsync(cachedFilePath, { idempotent: true }).catch(() => {});
			return null;
		}

		logger.debug(`HLS download complete: ${cachedFilePath}`);
		return cachedFilePath;
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		logger.warn(`HLS download failed: ${message}`);
		await FileSystem.deleteAsync(tempDir, { idempotent: true }).catch(() => {});
		await FileSystem.deleteAsync(cachedFilePath, { idempotent: true }).catch(() => {});
		return null;
	}
}

interface AdaptiveFormatResult {
	stream: AudioStream;
	contentLength?: number;
}

async function tryAdaptiveFormat(
	client: InnertubeClient,
	videoId: string,
	quality: string,
	clientType: 'TV' | 'IOS' | 'ANDROID' = 'TV'
): Promise<AdaptiveFormatResult | null> {
	try {
		logger.debug(`[Adaptive] Trying ${clientType} client for video: ${videoId}`);
		const videoInfo = await client.getInfo(videoId, { client: clientType });
		logger.debug(`[Adaptive] Got videoInfo from ${clientType}`);

		if (!videoInfo.streaming_data) {
			logger.warn(`[Adaptive] No streaming_data from ${clientType} client`);
			return null;
		}

		logger.debug(`[Adaptive] streaming_data exists, choosing format...`);
		const format = videoInfo.chooseFormat({ type: 'audio', quality: 'best' });

		if (!format) {
			logger.warn(`[Adaptive] No audio format found from ${clientType} client`);
			return null;
		}

		// Extract actual format from mime type (e.g., "audio/mp4" -> "m4a", "audio/webm" -> "webm")
		const mimeType = format.mime_type ?? 'audio/mp4';
		let audioFormat: 'm4a' | 'mp3' | 'webm' | 'ogg' | 'flac' | 'wav' = 'm4a';
		if (mimeType.includes('webm')) {
			audioFormat = 'webm';
		} else if (mimeType.includes('ogg')) {
			audioFormat = 'ogg';
		}

		// Get content length for download verification
		const contentLength = format.content_length ? Number(format.content_length) : undefined;

		logger.debug(
			`[Adaptive] Found format: itag=${format.itag}, mime=${mimeType}, ` +
				`bitrate=${format.bitrate}, contentLength=${contentLength ?? 'unknown'}`
		);

		// Try to get URL - some formats have direct URL, others need deciphering
		let url: string | undefined;

		if (format.url) {
			logger.debug('[Adaptive] Format has direct URL');
			url = format.url;
		} else if (format.decipher) {
			logger.debug('[Adaptive] Deciphering URL...');
			url = await format.decipher(client.session.player);
			logger.debug('[Adaptive] Decipher complete');
		} else {
			logger.warn('[Adaptive] Format has no URL and no decipher method');
		}

		if (url) {
			logger.debug(`[Adaptive] Got URL from ${clientType} (length: ${url.length})`);
			return {
				stream: createAudioStream({
					url,
					format: audioFormat,
					quality: quality as 'low' | 'medium' | 'high',
					// No Range header for downloads - we want the complete file with proper metadata
					headers: {
						Accept: '*/*',
						Origin: 'https://www.youtube.com',
						Referer: 'https://www.youtube.com/',
						'User-Agent': 'Mozilla/5.0 (ChromiumStylePlatform) Cobalt/Version',
					},
				}),
				contentLength,
			};
		}

		logger.warn(`[Adaptive] Failed to get URL from ${clientType} client`);
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		logger.error(`[Adaptive] Error with ${clientType} client: ${message}`);
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

				// Only use cache for downloads (preferDownloadable), not for streaming
				// Cached files from HLS downloads are fMP4 which don't support seeking
				// For streaming, we use HLS directly which supports seeking natively
				if (preferDownloadable) {
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
				}

				const client = await clientManager.createFreshClient();
				const cookies = await clientManager.getCookies();

				if (cookies) {
					logger.debug('Using authenticated download with cookies');
				}

				// When preferDownloadable is set (for downloads), try adaptive format first
				// HLS manifests can't be saved as files, so we need direct URLs for downloads
				if (preferDownloadable) {
					logger.debug('Preferring downloadable format...');

					// Try multiple client types for better compatibility
					const clientTypes: ('TV' | 'ANDROID' | 'IOS')[] = ['TV', 'ANDROID', 'IOS'];
					for (const clientType of clientTypes) {
						const adaptiveResult = await tryAdaptiveFormat(
							client,
							videoId,
							quality,
							clientType
						);
						if (adaptiveResult) {
							const { stream: adaptiveStream, contentLength } = adaptiveResult;
							// Try to download and cache the file for reliability
							logger.debug(
								`Attempting to cache downloaded audio (expected: ${contentLength ?? 'unknown'} bytes)...`
							);
							const cachedFile = await downloadToCache(
								adaptiveStream.url,
								videoId,
								adaptiveStream.headers,
								cookies,
								contentLength
							);
							if (cachedFile) {
								return ok(
									createAudioStream({
										url: cachedFile,
										format: adaptiveStream.format,
										quality,
									})
								);
							}
							// If caching failed, return stream URL with cookies for download manager
							logger.debug('Caching failed, returning stream URL directly');
							const headersWithCookies = { ...adaptiveStream.headers };
							if (cookies) {
								headersWithCookies['Cookie'] = cookies;
								logger.debug('Including cookies in stream headers for download');
							}
							return ok(
								createAudioStream({
									url: adaptiveStream.url,
									format: adaptiveStream.format,
									quality: adaptiveStream.quality,
									headers: headersWithCookies,
								})
							);
						}
					}

					// Last resort: try downloading from HLS stream
					logger.debug('Adaptive formats failed, trying HLS download...');
					const hlsUrl =
						(await tryHlsStream(client, videoId, 'IOS')) ||
						(await tryHlsStream(client, videoId, 'TV'));

					if (hlsUrl) {
						logger.debug('Found HLS manifest, downloading segments...');
						const cachedFile = await downloadHlsToCache(hlsUrl, videoId, cookies);
						if (cachedFile) {
							return ok(
								createAudioStream({
									url: cachedFile,
									format: 'm4a',
									quality,
								})
							);
						}
						logger.debug('HLS download failed');
					}

					logger.debug('All download attempts failed');
					return err(new Error('No downloadable audio format available for this track'));
				}

				// For streaming playback, try adaptive formats first (better quality, seekable)
				// When authenticated, we cache to local file since RNTP can't forward cookies
				logger.debug('Streaming playback: trying adaptive formats first...');

				const playbackClients: ('TV' | 'ANDROID' | 'IOS')[] = ['TV', 'ANDROID', 'IOS'];
				for (const clientType of playbackClients) {
					const adaptiveResult = await tryAdaptiveFormat(
						client,
						videoId,
						quality,
						clientType
					);
					if (adaptiveResult) {
						const { stream: adaptiveStream, contentLength } = adaptiveResult;

						// When authenticated, cache to avoid header forwarding issues
						if (cookies) {
							logger.debug(
								`Got adaptive stream from ${clientType}, caching (expected: ${contentLength ?? 'unknown'} bytes)...`
							);
							const cachedFile = await downloadToCache(
								adaptiveStream.url,
								videoId,
								adaptiveStream.headers,
								cookies,
								contentLength
							);
							if (cachedFile) {
								logger.debug('Audio cached successfully for playback');
								return ok(
									createAudioStream({
										url: cachedFile,
										format: adaptiveStream.format,
										quality,
									})
								);
							}
						} else {
							// Unauthenticated: try direct URL (may work for some content)
							logger.debug(
								`Got adaptive stream from ${clientType}, trying direct playback...`
							);
							return ok(
								createAudioStream({
									url: adaptiveStream.url,
									format: adaptiveStream.format,
									quality,
									headers: adaptiveStream.headers,
								})
							);
						}
					}
				}
				logger.debug('Adaptive formats failed, trying HLS...');

				// Try HLS streaming
				logger.debug('Trying HLS streaming...');
				const hlsUrl =
					(await tryHlsStream(client, videoId, 'IOS')) ||
					(await tryHlsStream(client, videoId, 'TV'));

				if (hlsUrl) {
					// When authenticated, HLS segments require cookies but RNTP can't forward
					// headers to segment requests. Cache the audio for reliable playback.
					if (cookies) {
						logger.debug('Authenticated user: caching HLS for reliable playback...');
						const cachedFile = await downloadHlsToCache(hlsUrl, videoId, cookies, true);
						if (cachedFile) {
							logger.debug('HLS cached successfully for playback');
							return ok(
								createAudioStream({
									url: cachedFile,
									format: 'm4a',
									quality,
								})
							);
						}
						logger.debug('HLS caching failed, trying direct HLS as fallback...');
					}

					// Unauthenticated or caching failed: try direct HLS
					// Native player handles HLS natively with seeking support
					logger.debug('Using direct HLS streaming (native player support)');
					const playbackHeaders: Record<string, string> = {
						Accept: '*/*',
						Origin: 'https://www.youtube.com',
						Referer: 'https://www.youtube.com/',
						'User-Agent': 'Mozilla/5.0 (ChromiumStylePlatform) Cobalt/Version',
					};
					if (cookies) {
						playbackHeaders['Cookie'] = cookies;
					}
					return ok(
						createAudioStream({
							url: hlsUrl,
							format: 'hls',
							quality,
							headers: playbackHeaders,
						})
					);
				}

				// Nothing worked
				return err(new Error('No streaming data available - all format attempts failed'));
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
