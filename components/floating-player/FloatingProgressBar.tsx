import { View } from 'react-native';
import { usePlaybackProgress } from '@/src/application/state/player-store';

const TRACK_HEIGHT = 3;

/**
 * A thin progress bar for the floating player.
 * Shows playback progress without seeking capability.
 */
export function FloatingProgressBar() {
  const { percentage } = usePlaybackProgress();

  return (
    <View
      className="w-full bg-muted/30 rounded-full overflow-hidden"
      style={{ height: TRACK_HEIGHT }}
    >
      <View
        className="h-full bg-primary rounded-full"
        style={{ width: `${percentage}%` }}
      />
    </View>
  );
}
