import type { TrackAction, TrackActionContext } from '../../../../domain/actions/track-action';
import type { TrackActionResult } from '../../../../application/events/track-action-events';
import { CORE_ACTION_IDS } from '../../../../domain/actions/track-action';

export function getNavigationActions(context: TrackActionContext): TrackAction[] {
	const { track } = context;

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

	// VIEW_LYRICS is now provided by the lyrics plugin
	return actions;
}

export async function executeNavigationAction(
	actionId: string,
	context: TrackActionContext
): Promise<TrackActionResult> {
	const { track } = context;

	switch (actionId) {
		case CORE_ACTION_IDS.VIEW_ARTIST: {
			const artist = track.artists[0];
			if (artist) {
				return {
					handled: true,
					navigation: {
						pathname: '/artist/[id]',
						params: { id: artist.id, name: artist.name },
					},
				};
			}
			return { handled: false };
		}

		case CORE_ACTION_IDS.VIEW_ALBUM: {
			const album = track.album;
			if (album) {
				return {
					handled: true,
					navigation: {
						pathname: '/album/[id]',
						params: { id: album.id, name: album.name },
					},
				};
			}
			return { handled: false };
		}

		default:
			return { handled: false };
	}
}
