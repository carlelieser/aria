/**
 * PlayerControls Component
 *
 * Main playback controls with play/pause, skip, shuffle, and repeat.
 * Uses M3 theming.
 */

import { View, StyleSheet } from 'react-native';
import { IconButton, FAB } from 'react-native-paper';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Repeat,
  Repeat1,
  Shuffle,
} from 'lucide-react-native';
import { usePlayer } from '@/hooks/use-player';
import { useAppTheme } from '@/lib/theme';

interface PlayerControlsProps {
  size?: 'sm' | 'md' | 'lg';
}

export function PlayerControls({ size = 'md' }: PlayerControlsProps) {
  const {
    isPlaying,
    isLoading,
    repeatMode,
    isShuffled,
    togglePlayPause,
    skipToPrevious,
    skipToNext,
    cycleRepeatMode,
    toggleShuffle,
  } = usePlayer();
  const { colors } = useAppTheme();

  const iconSizes = {
    sm: { main: 32, secondary: 24, fab: 'small' as const },
    md: { main: 48, secondary: 28, fab: 'medium' as const },
    lg: { main: 64, secondary: 32, fab: 'large' as const },
  };

  const { secondary: secondaryIconSize, fab: fabSize } = iconSizes[size];

  const PlayPauseIcon = isPlaying ? Pause : Play;
  const RepeatIconComponent = repeatMode === 'one' ? Repeat1 : Repeat;
  const repeatActive = repeatMode !== 'off';

  return (
    <View style={styles.container}>
      {/* Shuffle */}
      <IconButton
        icon={({ size: iconSize }) => (
          <Shuffle size={secondaryIconSize} color={colors.onSurface} />
        )}
        size={secondaryIconSize}
        onPress={toggleShuffle}
        style={[styles.secondaryButton, { opacity: isShuffled ? 1 : 0.5 }]}
      />

      {/* Previous */}
      <IconButton
        icon={({ size: iconSize }) => (
          <SkipBack size={secondaryIconSize} color={colors.onSurface} fill={colors.onSurface} />
        )}
        size={secondaryIconSize}
        onPress={skipToPrevious}
        disabled={isLoading}
      />

      {/* Play/Pause FAB */}
      <FAB
        icon={({ size: iconSize }) => (
          <PlayPauseIcon size={32} color={colors.onPrimary} fill={colors.onPrimary} />
        )}
        size={fabSize}
        onPress={togglePlayPause}
        disabled={isLoading}
        style={[styles.fab, { backgroundColor: colors.primary }]}
      />

      {/* Next */}
      <IconButton
        icon={({ size: iconSize }) => (
          <SkipForward size={secondaryIconSize} color={colors.onSurface} fill={colors.onSurface} />
        )}
        size={secondaryIconSize}
        onPress={skipToNext}
        disabled={isLoading}
      />

      {/* Repeat */}
      <IconButton
        icon={({ size: iconSize }) => (
          <RepeatIconComponent size={secondaryIconSize} color={colors.onSurface} />
        )}
        size={secondaryIconSize}
        onPress={cycleRepeatMode}
        style={[styles.secondaryButton, { opacity: repeatActive ? 1 : 0.5 }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  secondaryButton: {
    margin: 0,
  },
  fab: {
    marginHorizontal: 16,
  },
});
