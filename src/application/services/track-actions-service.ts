import type { Track } from '../../domain/entities/track';
import type {
	TrackAction,
	TrackActionContext,
	TrackActionSource,
} from '../../domain/actions/track-action';
import { ACTION_GROUP_ORDER, CORE_ACTION_IDS } from '../../domain/actions/track-action';
import type {
	TrackActionsRequestEvent,
	TrackActionsResponseEvent,
	TrackActionExecutedEvent,
} from '../events/track-action-events';
import { TRACK_ACTION_EVENTS } from '../events/track-action-events';
import { getPluginRegistry } from '../../plugins/core/registry/plugin-registry';
import { useLibraryStore } from '../state/library-store';
import { usePlayerStore } from '../state/player-store';
import { libraryService } from './library-service';
import { downloadService } from './download-service';

const PLUGIN_RESPONSE_TIMEOUT_MS = 100;

export class TrackActionsService {
	async getActionsForTrack(context: TrackActionContext): Promise<TrackAction[]> {
		const { track, source } = context;

		const coreActions = this._getCoreActions(track, source);

		const pluginActions = await this._getPluginActions(track, source);

		return this._mergeAndSortActions(coreActions, pluginActions);
	}

	async executeAction(actionId: string, context: TrackActionContext): Promise<void> {
		const { track, source } = context;

		switch (actionId) {
			case CORE_ACTION_IDS.ADD_TO_LIBRARY:
				libraryService.addTrack(track);
				break;

			case CORE_ACTION_IDS.REMOVE_FROM_LIBRARY:
				libraryService.removeTrack(track.id.value);
				break;

			case CORE_ACTION_IDS.ADD_TO_QUEUE:
				this._addToQueue(track);
				break;

			case CORE_ACTION_IDS.TOGGLE_FAVORITE:
				this._toggleFavorite(track);
				break;

			case CORE_ACTION_IDS.ADD_TO_PLAYLIST:
			case CORE_ACTION_IDS.VIEW_ARTIST:
			case CORE_ACTION_IDS.VIEW_ALBUM:
				break;

			case CORE_ACTION_IDS.DOWNLOAD:
				await downloadService.downloadTrack(track);
				break;

			case CORE_ACTION_IDS.REMOVE_DOWNLOAD:
				await downloadService.removeDownload(track.id.value);
				break;

			default:
				this._emitActionExecuted(actionId, track, source);
		}
	}

	private _getCoreActions(track: Track, source: TrackActionSource): TrackAction[] {
		const isInLibrary = libraryService.isInLibrary(track.id.value);
		const isFavorite = useLibraryStore.getState().isFavorite(track.id.value);
		const hasArtist = track.artists.length > 0;
		const hasAlbum = !!track.album;

		const actions: TrackAction[] = [];

		if (source === 'search' || isInLibrary) {
			actions.push({
				id: isInLibrary
					? CORE_ACTION_IDS.REMOVE_FROM_LIBRARY
					: CORE_ACTION_IDS.ADD_TO_LIBRARY,
				label: isInLibrary ? 'Remove from Library' : 'Add to Library',
				icon: isInLibrary ? 'LibraryBig' : 'LibraryBig',
				group: 'primary',
				priority: 110,
				enabled: true,
				variant: isInLibrary ? 'destructive' : 'default',
			});
		}

		actions.push(
			{
				id: CORE_ACTION_IDS.ADD_TO_QUEUE,
				label: 'Add to Queue',
				icon: 'ListPlus',
				group: 'primary',
				priority: 100,
				enabled: true,
			},
			{
				id: CORE_ACTION_IDS.ADD_TO_PLAYLIST,
				label: 'Add to Playlist',
				icon: 'ListMusic',
				group: 'primary',
				priority: 90,
				enabled: true,
			},
			{
				id: CORE_ACTION_IDS.TOGGLE_FAVORITE,
				label: isFavorite ? 'Remove from Favorites' : 'Add to Favorites',
				icon: isFavorite ? 'HeartOff' : 'Heart',
				group: 'primary',
				priority: 80,
				enabled: true,
				checked: isFavorite,
			}
		);

		if (source !== 'player') {
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
		}

		const isDownloaded = downloadService.isDownloaded(track.id.value);
		const isDownloading = downloadService.isDownloading(track.id.value);

		if (!isDownloaded && !isDownloading) {
			actions.push({
				id: CORE_ACTION_IDS.DOWNLOAD,
				label: 'Download',
				icon: 'Download',
				group: 'secondary',
				priority: 50,
				enabled: true,
			});
		} else if (isDownloading) {
			actions.push({
				id: CORE_ACTION_IDS.DOWNLOAD,
				label: 'Downloading...',
				icon: 'Loader',
				group: 'secondary',
				priority: 50,
				enabled: false,
			});
		} else if (isDownloaded) {
			actions.push({
				id: CORE_ACTION_IDS.REMOVE_DOWNLOAD,
				label: 'Remove Download',
				icon: 'Trash2',
				group: 'secondary',
				priority: 50,
				enabled: true,
				variant: 'destructive',
			});
		}

		return actions;
	}

	private async _getPluginActions(
		track: Track,
		source: TrackActionSource
	): Promise<TrackAction[]> {
		const eventBus = getPluginRegistry().getEventBus();
		const requestId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;

		const pluginActions: TrackAction[] = [];

		const unsubscribe = eventBus.on<TrackActionsResponseEvent>(
			TRACK_ACTION_EVENTS.RESPOND_ACTIONS,
			(event) => {
				if (event.requestId === requestId) {
					pluginActions.push(...event.actions);
				}
			}
		);

		const request: TrackActionsRequestEvent = { track, source, requestId };
		eventBus.emit(TRACK_ACTION_EVENTS.REQUEST_ACTIONS, request);

		await new Promise((resolve) => setTimeout(resolve, PLUGIN_RESPONSE_TIMEOUT_MS));

		unsubscribe();

		return pluginActions;
	}

	private _mergeAndSortActions(
		coreActions: TrackAction[],
		pluginActions: TrackAction[]
	): TrackAction[] {
		const allActions = [...coreActions, ...pluginActions];

		return allActions.sort((a, b) => {
			const groupIndexA = ACTION_GROUP_ORDER.indexOf(a.group);
			const groupIndexB = ACTION_GROUP_ORDER.indexOf(b.group);
			const groupDiff = groupIndexA - groupIndexB;

			if (groupDiff !== 0) return groupDiff;
			return b.priority - a.priority;
		});
	}

	private _addToQueue(track: Track): void {
		const store = usePlayerStore.getState();
		const currentQueue = store.queue;

		store.setQueue([...currentQueue, track], store.queueIndex);
	}

	private _toggleFavorite(track: Track): void {
		useLibraryStore.getState().toggleFavorite(track.id.value);
	}

	private _emitActionExecuted(actionId: string, track: Track, source: TrackActionSource): void {
		const eventBus = getPluginRegistry().getEventBus();
		const event: TrackActionExecutedEvent = {
			actionId,
			track,
			source,
			timestamp: Date.now(),
		};
		eventBus.emit(TRACK_ACTION_EVENTS.ACTION_EXECUTED, event);
	}
}

export const trackActionsService = new TrackActionsService();
