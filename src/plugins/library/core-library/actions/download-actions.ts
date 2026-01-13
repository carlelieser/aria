import type { TrackAction, TrackActionContext } from '../../../../domain/actions/track-action';
import type { TrackActionResult } from '../../../../application/events/track-action-events';
import { CORE_ACTION_IDS } from '../../../../domain/actions/track-action';
import { downloadService } from '../../../../application/services/download-service';

export function getDownloadActions(context: TrackActionContext): TrackAction[] {
	const { track } = context;
	const isDownloaded = downloadService.isDownloaded(track.id.value);
	const isDownloading = downloadService.isDownloading(track.id.value);

	if (isDownloading) {
		return [
			{
				id: CORE_ACTION_IDS.DOWNLOAD,
				label: 'Downloading...',
				icon: 'Loader',
				group: 'secondary',
				priority: 50,
				enabled: false,
			},
		];
	}

	if (isDownloaded) {
		return [
			{
				id: CORE_ACTION_IDS.REMOVE_DOWNLOAD,
				label: 'Remove Download',
				icon: 'Trash2',
				group: 'secondary',
				priority: 50,
				enabled: true,
				variant: 'destructive',
			},
		];
	}

	return [
		{
			id: CORE_ACTION_IDS.DOWNLOAD,
			label: 'Download',
			icon: 'Download',
			group: 'secondary',
			priority: 50,
			enabled: true,
		},
	];
}

export async function executeDownloadAction(
	actionId: string,
	context: TrackActionContext
): Promise<TrackActionResult> {
	const { track } = context;

	switch (actionId) {
		case CORE_ACTION_IDS.DOWNLOAD: {
			const result = await downloadService.downloadTrack(track);
			if (result.success) {
				return {
					handled: true,
					success: true,
					feedback: { message: 'Download complete', description: track.title },
				};
			}
			return {
				handled: true,
				success: false,
				feedback: {
					message: 'Download failed',
					description: result.error.message,
					type: 'error',
				},
			};
		}

		case CORE_ACTION_IDS.REMOVE_DOWNLOAD:
			await downloadService.removeDownload(track.id.value);
			return {
				handled: true,
				success: true,
				feedback: { message: 'Download removed', description: track.title },
			};

		default:
			return { handled: false };
	}
}
