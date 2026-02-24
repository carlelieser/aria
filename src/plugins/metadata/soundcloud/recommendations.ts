import type { Result } from '@shared/types/result';
import { ok, err } from '@shared/types/result';
import type { Track } from '@domain/entities/track';
import type { RecommendationSeed } from '@plugins/core/interfaces/metadata-provider';
import type { SoundCloudClient } from './client';
import { mapSoundCloudTracks } from './mappers';

export interface RecommendationOperations {
	getRecommendations(seed: RecommendationSeed, limit?: number): Promise<Result<Track[], Error>>;
}

export function createRecommendationOperations(client: SoundCloudClient): RecommendationOperations {
	return {
		async getRecommendations(
			seed: RecommendationSeed,
			limit?: number
		): Promise<Result<Track[], Error>> {
			const seedTrack = seed.tracks?.find((id) => id.sourceType === 'soundcloud');

			if (!seedTrack) {
				return err(new Error('SoundCloud recommendations require a track seed'));
			}

			const result = await client.getRelatedTracks(seedTrack.sourceId);

			if (!result.success) {
				return err(result.error);
			}

			const tracks = mapSoundCloudTracks(result.data.collection);
			const limited = limit ? tracks.slice(0, limit) : tracks;

			return ok(limited);
		},
	};
}
