import type { Track } from '@domain/entities/track';
import type { HomeFeedData } from '@domain/entities/feed-section';
import type { Result } from '@shared/types/result';

export interface HomeFeedOperations {
	getHomeFeed(): Promise<Result<HomeFeedData, Error>>;
	applyFilter(chipText: string): Promise<Result<HomeFeedData, Error>>;
	loadMore(): Promise<Result<HomeFeedData, Error>>;
	getPlaylistTracks(playlistId: string): Promise<Result<Track[], Error>>;
}
