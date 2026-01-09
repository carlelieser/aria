import { View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { ListFilter } from 'lucide-react-native';
import { useCurrentTrack } from '@/src/application/state/player-store';

const FLOATING_PLAYER_HEIGHT = 64;
const FLOATING_PLAYER_MARGIN = 8;
const FAB_BASE_BOTTOM = 16;

interface SortFilterFABProps {
  filterCount: number;
  onPress: () => void;
}

export function SortFilterFAB({ filterCount, onPress }: SortFilterFABProps) {
  const insets = useSafeAreaInsets();
  const currentTrack = useCurrentTrack();
  const isFloatingPlayerVisible = currentTrack !== null;

  const animatedStyle = useAnimatedStyle(() => {
    const floatingPlayerOffset = isFloatingPlayerVisible
      ? FLOATING_PLAYER_HEIGHT + FLOATING_PLAYER_MARGIN
      : 0;
    const bottomPosition = insets.bottom + FAB_BASE_BOTTOM + floatingPlayerOffset;

    return {
      bottom: withTiming(bottomPosition, { duration: 200 }),
    };
  }, [isFloatingPlayerVisible, insets.bottom]);

  return (
    <Animated.View className="absolute right-4" style={animatedStyle}>
      <Button
        variant="secondary"
        size="icon"
        className="h-14 w-14 rounded-full shadow-lg"
        onPress={onPress}
      >
        <Icon as={ListFilter} size={22} className="text-secondary-foreground" />
        {filterCount > 0 && (
          <View className="absolute -top-1 -right-1 bg-destructive rounded-full min-w-5 h-5 items-center justify-center px-1">
            <Text className="text-xs font-bold text-destructive-foreground">
              {filterCount}
            </Text>
          </View>
        )}
      </Button>
    </Animated.View>
  );
}
