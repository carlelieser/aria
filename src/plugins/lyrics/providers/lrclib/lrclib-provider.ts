import type { Track } from '@domain/entities/track';
import type { Lyrics } from '../../../core/interfaces/metadata-provider';
import type { LyricsProvider, LyricsSearchParams } from '../../domain/lyrics-provider';
import type { AsyncResult } from '@shared/types/result';
import { ok, err } from '@shared/types/result';
import { LrcLibClient } from './client';
import { mapLrcLibResponseToLyrics } from './mappers';

export class LrcLibProvider implements LyricsProvider {
	readonly id = 'lrclib';
	readonly name = 'LRCLIB';
	readonly priority: number;
	readonly enabled: boolean;

	private readonly _client: LrcLibClient;

	constructor(options: { priority?: number; enabled?: boolean } = {}) {
		this.priority = options.priority ?? 10;
		this.enabled = options.enabled ?? true;
		this._client = new LrcLibClient();
	}

	async searchLyrics(params: LyricsSearchParams): AsyncResult<Lyrics | null, Error> {
		const { track, artist, album, duration } = params;

		const result = await this._client.searchLyrics({
			trackName: track.title,
			artistName: artist,
			albumName: album,
			duration,
		});

		if (!result.success) {
			return err(result.error);
		}

		if (!result.data) {
			return ok(null);
		}

		if (result.data.instrumental) {
			return ok(null);
		}

		if (!result.data.syncedLyrics && !result.data.plainLyrics) {
			return ok(null);
		}

		return ok(mapLrcLibResponseToLyrics(result.data, track.id));
	}

	canHandleTrack(_track: Track): boolean {
		return true;
	}

	async isAvailable(): Promise<boolean> {
		try {
			const response = await fetch('https://lrclib.net/api/get?track_name=test', {
				method: 'HEAD',
			});
			return response.status !== 503;
		} catch {
			return false;
		}
	}
}

export function createLrcLibProvider(options?: {
	priority?: number;
	enabled?: boolean;
}): LrcLibProvider {
	return new LrcLibProvider(options);
}
