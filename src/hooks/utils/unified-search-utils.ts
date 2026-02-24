/**
 * Unified Search Utilities
 *
 * Pure helper functions for sort field mapping and download matching.
 */

import type { SortField } from '@/src/domain/utils/track-filtering';
import type { SearchSortField } from '@/src/domain/utils/search-filtering';
import type { DownloadedTrackMetadata } from '@/src/domain/value-objects/download-state';
import { createTrackFromDownloadedMetadata } from '@/src/domain/utils/create-track-from-download';
import type { Track } from '@/src/domain/entities/track';

/**
 * Maps a UnifiedSortField to a library SortField.
 * 'relevance' has no local signal, so it falls back to 'dateAdded'.
 */
export function toLibrarySortField(field: string): SortField {
	switch (field) {
		case 'title':
		case 'artist':
		case 'dateAdded':
		case 'duration':
			return field;
		default:
			return 'dateAdded';
	}
}

/**
 * Maps a UnifiedSortField to an explore SearchSortField.
 * 'dateAdded' has no remote signal, so it falls back to 'relevance'.
 */
export function toExploreSortField(field: string): SearchSortField {
	switch (field) {
		case 'relevance':
		case 'title':
		case 'artist':
		case 'duration':
			return field;
		default:
			return 'relevance';
	}
}

/**
 * Find download IDs that match a query string by title, artist, or album.
 */
export function findMatchingDownloadIds(
	downloadedTracksMap: Map<string, DownloadedTrackMetadata>,
	query: string
): string[] {
	const queryLower = query.toLowerCase();
	const matchedIds: string[] = [];

	for (const [trackId, metadata] of downloadedTracksMap) {
		const titleMatch = metadata.title.toLowerCase().includes(queryLower);
		const artistMatch = metadata.artistName.toLowerCase().includes(queryLower);
		const albumMatch = metadata.albumName?.toLowerCase().includes(queryLower) ?? false;

		if (titleMatch || artistMatch || albumMatch) {
			matchedIds.push(trackId);
		}
	}

	return matchedIds;
}

/**
 * Resolve download track IDs into Track objects using resolved tracks or metadata fallback.
 */
export function resolveDownloadsTracks(
	matchingDownloadIds: string[],
	resolvedDownloadTracks: Map<string, Track>,
	downloadedTracksMap: Map<string, DownloadedTrackMetadata>
): Track[] {
	return matchingDownloadIds.map((trackId) => {
		const resolved = resolvedDownloadTracks.get(trackId);
		if (resolved) return resolved;

		const metadata = downloadedTracksMap.get(trackId);
		if (metadata) return createTrackFromDownloadedMetadata(metadata);

		return createTrackFromDownloadedMetadata({
			trackId,
			filePath: '',
			fileSize: 0,
			downloadedAt: 0,
			sourcePlugin: 'unknown',
			format: 'unknown',
			title: 'Unknown',
			artistName: 'Unknown',
		});
	});
}

/**
 * Build base tracks with downloaded-only filter applied.
 */
export function buildLibraryBaseTracks(
	allTracks: Track[],
	downloadedOnly: boolean,
	downloadedIds: Set<string>,
	downloadedTracksMap: Map<string, DownloadedTrackMetadata>
): Track[] {
	if (!downloadedOnly) {
		return allTracks;
	}

	const libraryTrackIds = new Set(allTracks.map((t) => t.id.value));
	const downloadedLibraryTracks = allTracks.filter((t) => downloadedIds.has(t.id.value));
	const nonLibraryDownloads: Track[] = [];

	for (const [trackId, metadata] of downloadedTracksMap) {
		if (!libraryTrackIds.has(trackId)) {
			nonLibraryDownloads.push(createTrackFromDownloadedMetadata(metadata));
		}
	}

	return [...downloadedLibraryTracks, ...nonLibraryDownloads];
}
