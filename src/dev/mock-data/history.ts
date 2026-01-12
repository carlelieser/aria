import type { Track } from '@domain/entities/track';
import { MOCK_TRACKS } from './tracks';

interface HistoryEntry {
	track: Track;
	playedAt: number;
}

const RECENTLY_PLAYED_INDICES = [3, 0, 12, 24, 18, 6, 27, 15, 21, 9, 1, 4, 13, 25, 7];

function createHistoryEntry(trackIndex: number, hoursAgo: number): HistoryEntry {
	return {
		track: MOCK_TRACKS[trackIndex],
		playedAt: Date.now() - hoursAgo * 60 * 60 * 1000,
	};
}

export const MOCK_HISTORY: HistoryEntry[] = RECENTLY_PLAYED_INDICES.map((trackIndex, index) =>
	createHistoryEntry(trackIndex, index * 2 + 1)
);

export const MOCK_FAVORITE_TRACK_IDS: string[] = [
	MOCK_TRACKS[0].id.value,
	MOCK_TRACKS[3].id.value,
	MOCK_TRACKS[12].id.value,
	MOCK_TRACKS[18].id.value,
	MOCK_TRACKS[24].id.value,
	MOCK_TRACKS[27].id.value,
	MOCK_TRACKS[6].id.value,
	MOCK_TRACKS[15].id.value,
];
