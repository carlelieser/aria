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

/** Timeout for waiting for plugin responses */
const PLUGIN_RESPONSE_TIMEOUT_MS = 100;

/**
 * Service for managing track actions
 * Provides core actions and coordinates with plugins for extensibility
 */
export class TrackActionsService {
  /**
   * Get all available actions for a track
   * Combines core actions with plugin-contributed actions
   */
  async getActionsForTrack(context: TrackActionContext): Promise<TrackAction[]> {
    const { track, source } = context;

    // Get core actions
    const coreActions = this._getCoreActions(track, source);

    // Get plugin actions via event bus
    const pluginActions = await this._getPluginActions(track, source);

    // Merge and sort
    return this._mergeAndSortActions(coreActions, pluginActions);
  }

  /**
   * Execute a track action by ID
   * Handles core actions directly, emits events for plugin actions
   */
  async executeAction(actionId: string, context: TrackActionContext): Promise<void> {
    const { track, source } = context;

    // Handle core actions
    switch (actionId) {
      case CORE_ACTION_IDS.ADD_TO_QUEUE:
        this._addToQueue(track);
        break;

      case CORE_ACTION_IDS.TOGGLE_FAVORITE:
        this._toggleFavorite(track);
        break;

      case CORE_ACTION_IDS.ADD_TO_PLAYLIST:
      case CORE_ACTION_IDS.VIEW_ARTIST:
      case CORE_ACTION_IDS.VIEW_ALBUM:
        // Navigation actions are handled by the UI layer (hook)
        break;

      default:
        // Plugin action - emit event for plugin to handle
        this._emitActionExecuted(actionId, track, source);
    }
  }

  /**
   * Get core actions available for a track
   */
  private _getCoreActions(track: Track, source: TrackActionSource): TrackAction[] {
    const isFavorite = useLibraryStore.getState().isFavorite(track.id.value);
    const hasArtist = track.artists.length > 0;
    const hasAlbum = !!track.album;

    const actions: TrackAction[] = [
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
      },
    ];

    // Navigation actions (conditionally shown based on context and data)
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

    return actions;
  }

  /**
   * Request actions from plugins via event bus
   */
  private async _getPluginActions(
    track: Track,
    source: TrackActionSource
  ): Promise<TrackAction[]> {
    const eventBus = getPluginRegistry().getEventBus();
    const requestId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;

    const pluginActions: TrackAction[] = [];

    // Set up listener for responses using the unsubscribe function pattern
    const unsubscribe = eventBus.on<TrackActionsResponseEvent>(
      TRACK_ACTION_EVENTS.RESPOND_ACTIONS,
      (event) => {
        if (event.requestId === requestId) {
          pluginActions.push(...event.actions);
        }
      }
    );

    // Emit request to all plugins
    const request: TrackActionsRequestEvent = { track, source, requestId };
    eventBus.emit(TRACK_ACTION_EVENTS.REQUEST_ACTIONS, request);

    // Wait for responses (with timeout)
    await new Promise((resolve) => setTimeout(resolve, PLUGIN_RESPONSE_TIMEOUT_MS));

    // Clean up listener
    unsubscribe();

    return pluginActions;
  }

  /**
   * Merge and sort actions by group order and priority
   */
  private _mergeAndSortActions(
    coreActions: TrackAction[],
    pluginActions: TrackAction[]
  ): TrackAction[] {
    const allActions = [...coreActions, ...pluginActions];

    // Sort by group order first, then by priority within group (descending)
    return allActions.sort((a, b) => {
      const groupIndexA = ACTION_GROUP_ORDER.indexOf(a.group);
      const groupIndexB = ACTION_GROUP_ORDER.indexOf(b.group);
      const groupDiff = groupIndexA - groupIndexB;

      if (groupDiff !== 0) return groupDiff;
      return b.priority - a.priority;
    });
  }

  /**
   * Add track to the end of the queue
   */
  private _addToQueue(track: Track): void {
    const store = usePlayerStore.getState();
    const currentQueue = store.queue;

    // Add to the end of the queue
    store.setQueue([...currentQueue, track], store.queueIndex);
  }

  /**
   * Toggle track favorite status
   */
  private _toggleFavorite(track: Track): void {
    useLibraryStore.getState().toggleFavorite(track.id.value);
  }

  /**
   * Emit action executed event for plugin actions
   */
  private _emitActionExecuted(
    actionId: string,
    track: Track,
    source: TrackActionSource
  ): void {
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

/** Singleton service instance */
export const trackActionsService = new TrackActionsService();
