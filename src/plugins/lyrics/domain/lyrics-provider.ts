import type { Track } from '@domain/entities/track';
import type { Lyrics } from '../../core/interfaces/metadata-provider';
import type { AsyncResult } from '@shared/types/result';

export interface LyricsSearchParams {
	readonly track: Track;
	readonly artist?: string;
	readonly album?: string;
	readonly duration?: number;
}

export interface LyricsProviderConfig {
	readonly apiKey?: string;
	readonly enabled?: boolean;
	readonly priority?: number;
}

export interface LyricsProvider {
	readonly id: string;
	readonly name: string;
	readonly priority: number;
	readonly enabled: boolean;

	searchLyrics(params: LyricsSearchParams): AsyncResult<Lyrics | null, Error>;

	canHandleTrack(track: Track): boolean;

	isAvailable(): Promise<boolean>;

	configure?(config: LyricsProviderConfig): void;
}

export function createLyricsProvider(
	id: string,
	name: string,
	options: {
		priority?: number;
		enabled?: boolean;
		searchLyrics: (params: LyricsSearchParams) => AsyncResult<Lyrics | null, Error>;
		canHandleTrack?: (track: Track) => boolean;
		isAvailable?: () => Promise<boolean>;
	}
): LyricsProvider {
	return {
		id,
		name,
		priority: options.priority ?? 50,
		enabled: options.enabled ?? true,
		searchLyrics: options.searchLyrics,
		canHandleTrack: options.canHandleTrack ?? (() => true),
		isAvailable: options.isAvailable ?? (async () => true),
	};
}
