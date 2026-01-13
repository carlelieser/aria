import type { TrackAction, TrackActionContext } from '@domain/actions/track-action';
import type { TrackActionResult } from '../../../application/events/track-action-events';
import { LYRICS_ACTION_IDS } from '../core/config';

export function getLyricsActions(_context: TrackActionContext): TrackAction[] {
	return [
		{
			id: LYRICS_ACTION_IDS.VIEW_LYRICS,
			label: 'View Lyrics',
			icon: 'MicVocal',
			group: 'navigation',
			priority: 50,
			enabled: true,
		},
	];
}

export async function executeLyricsAction(
	actionId: string,
	context: TrackActionContext
): Promise<TrackActionResult> {
	const { track } = context;

	switch (actionId) {
		case LYRICS_ACTION_IDS.VIEW_LYRICS:
			return {
				handled: true,
				navigation: {
					pathname: '/lyrics',
					params: { trackId: track.id.value },
				},
			};

		default:
			return { handled: false };
	}
}
