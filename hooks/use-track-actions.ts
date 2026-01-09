import { useState, useCallback, useEffect } from 'react';
import { router } from 'expo-router';
import type { Track } from '@/src/domain/entities/track';
import type { TrackAction, TrackActionSource } from '@/src/domain/actions/track-action';
import { CORE_ACTION_IDS } from '@/src/domain/actions/track-action';
import { trackActionsService } from '@/src/application/services/track-actions-service';
import { useIsFavorite } from '@/src/application/state/library-store';
import { useToast } from '@/hooks/use-toast';

interface UseTrackActionsOptions {
  /** The track to get actions for */
  track: Track;
  /** Where the menu was opened from */
  source: TrackActionSource;
}

interface UseTrackActionsResult {
  /** List of available actions */
  actions: TrackAction[];
  /** Whether actions are being loaded */
  isLoading: boolean;
  /** Execute an action by ID */
  executeAction: (actionId: string) => Promise<void>;
  /** Manually refresh the actions list */
  refresh: () => Promise<void>;
}

/**
 * Hook to get and execute track actions
 * Handles navigation actions in the UI layer, delegates others to the service
 */
export function useTrackActions({
  track,
  source,
}: UseTrackActionsOptions): UseTrackActionsResult {
  const [actions, setActions] = useState<TrackAction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { success } = useToast();

  // Re-fetch when favorite status changes to update the toggle label
  const isFavorite = useIsFavorite(track.id.value);

  const loadActions = useCallback(async () => {
    setIsLoading(true);
    try {
      const fetchedActions = await trackActionsService.getActionsForTrack({
        track,
        source,
      });
      setActions(fetchedActions);
    } finally {
      setIsLoading(false);
    }
  }, [track, source]);

  // Reload when track, source, or favorite status changes
  useEffect(() => {
    loadActions();
  }, [loadActions, isFavorite]);

  const executeAction = useCallback(
    async (actionId: string) => {
      // Handle navigation actions in the UI layer
      switch (actionId) {
        case CORE_ACTION_IDS.VIEW_ARTIST: {
          const artist = track.artists[0];
          if (artist) {
            router.push({
              pathname: '/artist/[id]',
              params: { id: artist.id, name: artist.name },
            });
          }
          return;
        }

        case CORE_ACTION_IDS.VIEW_ALBUM: {
          const album = track.album;
          if (album) {
            router.push({
              pathname: '/album/[id]',
              params: { id: album.id, name: album.name },
            });
          }
          return;
        }

        case CORE_ACTION_IDS.ADD_TO_PLAYLIST:
          router.push({
            pathname: '/playlist-picker',
            params: { trackId: track.id.value },
          });
          return;

        default: {
          // Capture state before action for toast messages
          const wasFavorite = isFavorite;

          // Delegate to service for all other actions
          await trackActionsService.executeAction(actionId, { track, source });

          // Show toast based on action type
          switch (actionId) {
            case CORE_ACTION_IDS.ADD_TO_LIBRARY:
              success('Added to library');
              break;
            case CORE_ACTION_IDS.REMOVE_FROM_LIBRARY:
              success('Removed from library');
              break;
            case CORE_ACTION_IDS.ADD_TO_QUEUE:
              success('Added to queue');
              break;
            case CORE_ACTION_IDS.TOGGLE_FAVORITE:
              success(wasFavorite ? 'Removed from favorites' : 'Added to favorites');
              break;
          }

          // Refresh actions after execution (state may have changed)
          await loadActions();
        }
      }
    },
    [track, source, loadActions, isFavorite, success]
  );

  return {
    actions,
    isLoading,
    executeAction,
    refresh: loadActions,
  };
}
