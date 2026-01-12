import type { TrackId } from '@domain/value-objects/track-id';
import { createAudioStream, type AudioStream } from '@domain/value-objects/audio-stream';
import type { StreamOptions } from '@plugins/core/interfaces/audio-source-provider';
import { err, type AsyncResult, ok } from '@shared/types/result';
import { useLocalLibraryStore } from '../storage/local-library-store';
import { getFormatFromPath } from '../utils/audio-utils';

/**
 * Get audio stream URL for a track.
 */
export async function getStreamUrl(
	trackId: TrackId,
	_options?: StreamOptions
): AsyncResult<AudioStream, Error> {
	const state = useLocalLibraryStore.getState();
	const localTrack = state.tracks[trackId.sourceId];

	if (!localTrack) {
		return err(new Error(`Track not found: ${trackId.value}`));
	}

	const format = getFormatFromPath(localTrack.filePath);

	return ok(
		createAudioStream({
			url: localTrack.filePath,
			format,
			quality: 'high',
			contentLength: localTrack.fileSize,
		})
	);
}
