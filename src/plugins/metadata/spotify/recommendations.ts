import type { Result } from '@shared/types/result';
import { ok, err } from '@shared/types/result';
import type { Track } from '@domain/entities/track';
import type {
	RecommendationSeed,
	RecommendationParams,
} from '@plugins/core/interfaces/metadata-provider';
import type { SpotifyClient } from './client';
import { mapSpotifyTracks } from './mappers';

export interface RecommendationOperations {
	getRecommendations(
		seed: RecommendationSeed,
		params?: RecommendationParams,
		limit?: number
	): Promise<Result<Track[], Error>>;
}

export function createRecommendationOperations(client: SpotifyClient): RecommendationOperations {
	return {
		async getRecommendations(
			seed: RecommendationSeed,
			params?: RecommendationParams,
			limit?: number
		): Promise<Result<Track[], Error>> {
			const seedTracks = seed.tracks
				?.filter((id) => id.sourceType === 'spotify')
				.map((id) => id.sourceId)
				.slice(0, 5);

			const seedArtists = seed.artists?.slice(0, 5);
			const seedGenres = seed.genres?.slice(0, 5);

			const totalSeeds =
				(seedTracks?.length ?? 0) + (seedArtists?.length ?? 0) + (seedGenres?.length ?? 0);

			if (totalSeeds === 0) {
				return err(new Error('At least one seed is required'));
			}

			if (totalSeeds > 5) {
				return err(new Error('Maximum 5 seeds allowed'));
			}

			const result = await client.getRecommendations({
				seed_tracks: seedTracks,
				seed_artists: seedArtists,
				seed_genres: seedGenres,
				limit: limit ?? 20,
				target_energy: params?.targetEnergy,
				target_danceability: params?.targetDanceability,
				target_valence: params?.targetValence,
				target_tempo: params?.targetTempo,
				target_popularity: params?.targetPopularity,
			});

			if (!result.success) {
				return err(result.error);
			}

			const tracks = mapSpotifyTracks(result.data.tracks);
			return ok(tracks);
		},
	};
}
