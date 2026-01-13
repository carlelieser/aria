import type { TrackAction, TrackActionContext } from '../../../../domain/actions/track-action';
import type { TrackActionResult } from '../../../../application/events/track-action-events';
import { CORE_ACTION_IDS } from '../../../../domain/actions/track-action';
import { libraryService } from '../../../../application/services/library-service';

export function getLibraryActions(context: TrackActionContext): TrackAction[] {
	const { track, source } = context;
	const isInLibrary = libraryService.isInLibrary(track.id.value);

	if (source !== 'search' && !isInLibrary) {
		return [];
	}

	return [
		{
			id: isInLibrary ? CORE_ACTION_IDS.REMOVE_FROM_LIBRARY : CORE_ACTION_IDS.ADD_TO_LIBRARY,
			label: isInLibrary ? 'Remove from Library' : 'Add to Library',
			icon: 'LibraryBig',
			group: 'primary',
			priority: 110,
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
		case CORE_ACTION_IDS.ADD_TO_LIBRARY:
			libraryService.addTrack(track);
			return {
				handled: true,
				success: true,
				feedback: { message: 'Added to library', description: track.title },
			};

		case CORE_ACTION_IDS.REMOVE_FROM_LIBRARY:
			libraryService.removeTrack(track.id.value);
			return {
				handled: true,
				success: true,
				feedback: { message: 'Removed from library', description: track.title },
			};

		default:
			return { handled: false };
	}
}
