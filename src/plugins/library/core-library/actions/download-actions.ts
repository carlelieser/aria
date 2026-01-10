import type { TrackAction, TrackActionContext } from '../../../../domain/actions/track-action';
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
): Promise<boolean> {
	const { track } = context;

	switch (actionId) {
		case CORE_ACTION_IDS.DOWNLOAD:
			await downloadService.downloadTrack(track);
			return true;

		case CORE_ACTION_IDS.REMOVE_DOWNLOAD:
			await downloadService.removeDownload(track.id.value);
			return true;

		default:
			return false;
	}
}
