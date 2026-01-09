/**
 * YouTube Music recommendations
 */

import type { RecommendationParams, RecommendationSeed } from '@plugins/core/interfaces/metadata-provider';
import type { Track } from '@domain/entities/track';
import type { Result } from '@shared/types/result';
import { ok, err } from '@shared/types/result';
import { mapYouTubeTrack } from './mappers';
import type { ClientManager } from './client';

/**
 * Recommendation operations interface
 */
export interface RecommendationOperations {
  getRecommendations(
    seed: RecommendationSeed,
    params?: RecommendationParams,
    limit?: number
  ): Promise<Result<Track[], Error>>;
}

/**
 * Create recommendation operations with client manager
 */
export function createRecommendationOperations(clientManager: ClientManager): RecommendationOperations {
  return {
    async getRecommendations(
      seed: RecommendationSeed,
      _params?: RecommendationParams,
      limit: number = 20
    ): Promise<Result<Track[], Error>> {
      try {
        const client = await clientManager.getClient();

        // Use the first seed track to get related content
        if (!seed.tracks || seed.tracks.length === 0) {
          return ok([]);
        }

        const seedTrackId = seed.tracks[0].sourceId;
        const info = await client.getInfo(seedTrackId);

        if (!info.watch_next_feed) {
          return ok([]);
        }

        const recommendations: Track[] = [];

        for (const item of info.watch_next_feed) {
          if (!item) continue;

          const track = mapYouTubeTrack(item);
          if (track) {
            recommendations.push(track);
          }

          if (recommendations.length >= limit) {
            break;
          }
        }

        return ok(recommendations);
      } catch (error) {
        return err(
          error instanceof Error
            ? error
            : new Error(`Failed to get recommendations: ${String(error)}`)
        );
      }
    },
  };
}
