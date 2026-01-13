import type { TrackAction, TrackActionContext } from '../../../../domain/actions/track-action';
import { CORE_ACTION_IDS } from '../../../../domain/actions/track-action';

export function getNavigationActions(context: TrackActionContext): TrackAction[] {
	const { track, source } = context;

	if (source === 'player') {
		return [];
	}

	const actions: TrackAction[] = [];
	const hasArtist = track.artists.length > 0;
	const hasAlbum = !!track.album;

	if (hasArtist) {
		actions.push({
			id: CORE_ACTION_IDS.VIEW_ARTIST,
			label: 'View Artist',
			icon: 'User',
			group: 'navigation',
			priority: 70,
			enabled: true,
		});
	}

	if (hasAlbum) {
		actions.push({
			id: CORE_ACTION_IDS.VIEW_ALBUM,
			label: 'View Album',
			icon: 'Disc3',
			group: 'navigation',
			priority: 60,
			enabled: true,
		});
	}

	actions.push({
		id: CORE_ACTION_IDS.VIEW_LYRICS,
		label: 'View Lyrics',
		icon: 'MicVocal',
		group: 'navigation',
		priority: 50,
		enabled: true,
	});

	return actions;
}

export async function executeNavigationAction(
	actionId: string,
	_context: TrackActionContext
): Promise<boolean> {
	switch (actionId) {
		case CORE_ACTION_IDS.VIEW_ARTIST:
		case CORE_ACTION_IDS.VIEW_ALBUM:
		case CORE_ACTION_IDS.VIEW_LYRICS:
			// Navigation is handled in use-track-actions.ts
			return false;

		default:
			return false;
	}
}
