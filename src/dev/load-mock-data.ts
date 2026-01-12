import { useLibraryStore } from '@application/state/library-store';
import { useDownloadStore } from '@application/state/download-store';
import { useHistoryStore } from '@application/state/history-store';
import { usePlayerStore } from '@application/state/player-store';
import { Duration } from '@domain/value-objects/duration';
import {
	MOCK_TRACKS,
	MOCK_PLAYLISTS,
	MOCK_DOWNLOADS,
	MOCK_DOWNLOADED_TRACKS,
	MOCK_HISTORY,
	MOCK_FAVORITE_TRACK_IDS,
} from './mock-data';

/**
 * Loads all mock data into the application stores.
 * Use this for screenshots and demo purposes.
 */
export function loadMockData(): void {
	_loadLibraryData();
	_loadDownloadData();
	_loadHistoryData();
	_loadPlayerData();
}

function _loadLibraryData(): void {
	const libraryStore = useLibraryStore.getState();

	libraryStore.addTracks(MOCK_TRACKS);

	for (const playlist of MOCK_PLAYLISTS) {
		libraryStore.addPlaylist(playlist);
	}

	for (const trackId of MOCK_FAVORITE_TRACK_IDS) {
		if (!libraryStore.isFavorite(trackId)) {
			libraryStore.toggleFavorite(trackId);
		}
	}

	libraryStore.setSyncedAt(new Date());
}

function _loadDownloadData(): void {
	const downloadStore = useDownloadStore.getState();

	for (const download of MOCK_DOWNLOADS) {
		if (download.status === 'pending') {
			downloadStore.startDownload(download.trackId, {
				title: download.title,
				artistName: download.artistName,
				artworkUrl: download.artworkUrl,
			});
		} else if (download.status === 'downloading') {
			downloadStore.startDownload(download.trackId, {
				title: download.title,
				artistName: download.artistName,
				artworkUrl: download.artworkUrl,
			});
			downloadStore.updateProgress(download.trackId, download.progress);
		} else if (download.status === 'completed') {
			const metadata = MOCK_DOWNLOADED_TRACKS.find((m) => m.trackId === download.trackId);
			if (metadata) {
				downloadStore.startDownload(download.trackId, {
					title: download.title,
					artistName: download.artistName,
					artworkUrl: download.artworkUrl,
				});
				downloadStore.completeDownload(download.trackId, metadata);
			}
		} else if (download.status === 'failed') {
			downloadStore.startDownload(download.trackId, {
				title: download.title,
				artistName: download.artistName,
				artworkUrl: download.artworkUrl,
			});
			downloadStore.failDownload(download.trackId, download.error ?? 'Unknown error');
		}
	}
}

function _loadHistoryData(): void {
	const historyStore = useHistoryStore.getState();

	const reversedHistory = [...MOCK_HISTORY].reverse();
	for (const entry of reversedHistory) {
		historyStore.addToHistory(entry.track);
	}
}

function _loadPlayerData(): void {
	const playerStore = usePlayerStore.getState();

	const currentTrack = MOCK_TRACKS[3];
	const queueTracks = MOCK_TRACKS.slice(0, 10);

	playerStore.setQueue(queueTracks, 3);

	playerStore._setStatus('paused');
	playerStore._setDuration(currentTrack.duration);
	playerStore._setPosition(Duration.fromSeconds(67));
}

/**
 * Clears all mock data from stores.
 * Useful for resetting before taking new screenshots.
 */
export function clearMockData(): void {
	const libraryStore = useLibraryStore.getState();
	const downloadStore = useDownloadStore.getState();
	const historyStore = useHistoryStore.getState();
	const playerStore = usePlayerStore.getState();

	for (const track of [...libraryStore.tracks]) {
		libraryStore.removeTrack(track.id.value);
	}

	for (const playlist of [...libraryStore.playlists]) {
		libraryStore.removePlaylist(playlist.id);
	}

	for (const download of MOCK_DOWNLOADS) {
		downloadStore.removeDownload(download.trackId);
	}

	historyStore.clearHistory();

	playerStore.stop();
}

/**
 * Check if mock data is currently loaded
 */
export function isMockDataLoaded(): boolean {
	const libraryStore = useLibraryStore.getState();
	return libraryStore.tracks.some((t) => t.id.value.startsWith('youtube-music:track-'));
}
