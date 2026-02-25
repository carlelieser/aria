import type { TrackAction, TrackActionContext } from '../../../../domain/actions/track-action';
import type { TrackActionResult } from '../../../../application/events/track-action-events';
import { CORE_ACTION_IDS } from '../../../../domain/actions/track-action';
import { libraryService } from '../../../../application/services/library-service';

export function getLibraryActions(context: TrackActionContext): TrackAction[] {
	const { track } = context;
	const isInLibrary = libraryService.isInLibrary(track.id.value);

	return [
		{
			id: isInLibrary ? CORE_ACTION_IDS.REMOVE_FROM_LIBRARY : CORE_ACTION_IDS.ADD_TO_LIBRARY,
			label: isInLibrary ? 'Remove' : 'Save',
			icon: isInLibrary ? 'BookmarkCheck' : 'Bookmark',
			group: isInLibrary ? 'danger' : 'secondary',
			priority: 30,
			enabled: true,
			variant: isInLibrary ? 'destructive' : 'default',
		},
	];
}

export async function executeLibraryAction(
	actionId: string,
	context: TrackActionContext
): Promise<TrackActionResult> {
	const { track } = context;

	switch (actionId) {
		case CORE_ACTION_IDS.ADD_TO_LIBRARY: {
			const result = libraryService.addTrack(track);
			return {
				handled: true,
				success: result.success,
				feedback: result.success
					? { message: 'Added to library', description: track.title }
					: { message: 'Failed to add to library', type: 'error' as const },
			};
		}

		case CORE_ACTION_IDS.REMOVE_FROM_LIBRARY: {
			const result = libraryService.removeTrack(track.id.value);
			return {
				handled: true,
				success: result.success,
				feedback: result.success
					? { message: 'Removed from library', description: track.title }
					: { message: 'Failed to remove from library', type: 'error' as const },
			};
		}

		default:
			return { handled: false };
	}
}
