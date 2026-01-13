import type { TrackAction, TrackActionContext } from '../../../../domain/actions/track-action';
import type { TrackActionResult } from '../../../../application/events/track-action-events';
import { CORE_ACTION_IDS } from '../../../../domain/actions/track-action';
import { libraryService } from '../../../../application/services/library-service';

export function getPlaylistActions(context: TrackActionContext): TrackAction[] {
	const { source, playlistId } = context;
	const actions: TrackAction[] = [];

	actions.push({
		id: CORE_ACTION_IDS.ADD_TO_PLAYLIST,
		label: 'Add to Playlist',
		icon: 'ListMusic',
		group: 'primary',
		priority: 90,
		enabled: true,
	});

	if (source === 'playlist' && playlistId) {
		actions.push({
			id: CORE_ACTION_IDS.REMOVE_FROM_PLAYLIST,
			label: 'Remove from Playlist',
			icon: 'ListMinus',
			group: 'secondary',
			priority: 10,
			enabled: true,
			variant: 'destructive',
		});
	}

	return actions;
}

export async function executePlaylistAction(
	actionId: string,
	context: TrackActionContext
): Promise<TrackActionResult> {
	const { track, playlistId, trackPosition } = context;

	switch (actionId) {
		case CORE_ACTION_IDS.ADD_TO_PLAYLIST:
			return {
				handled: true,
				navigation: {
					pathname: '/playlist-picker',
					params: { trackId: track.id.value },
				},
			};

		case CORE_ACTION_IDS.REMOVE_FROM_PLAYLIST:
			if (playlistId && trackPosition !== undefined) {
				libraryService.removeTrackFromPlaylist(playlistId, trackPosition);
				return {
					handled: true,
					success: true,
					feedback: { message: 'Removed from playlist', description: track.title },
				};
			}
			return { handled: false };

		default:
			return { handled: false };
	}
}
