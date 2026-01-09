import { View } from 'react-native';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import {
	PlayIcon,
	PauseIcon,
	SkipBackIcon,
	SkipForwardIcon,
	RepeatIcon,
	Repeat1Icon,
	ShuffleIcon,
} from 'lucide-react-native';
import { usePlayer } from '@/hooks/use-player';

interface PlayerControlsProps {
	size?: 'sm' | 'md' | 'lg';
}

export function PlayerControls({ size = 'md' }: PlayerControlsProps) {
	const {
		isPlaying,
		isPaused,
		isLoading,
		repeatMode,
		isShuffled,
		togglePlayPause,
		skipToPrevious,
		skipToNext,
		cycleRepeatMode,
		toggleShuffle,
	} = usePlayer();

	const iconSizes = {
		sm: { main: 32, secondary: 24 },
		md: { main: 48, secondary: 28 },
		lg: { main: 64, secondary: 32 },
	};

	const { main: mainIconSize, secondary: secondaryIconSize } = iconSizes[size];

	const PlayPauseIcon = isPlaying ? PauseIcon : PlayIcon;

	const RepeatIconComponent = repeatMode === 'one' ? Repeat1Icon : RepeatIcon;
	const repeatActive = repeatMode !== 'off';

	return (
		<View className="flex-row justify-center items-center gap-4">
			{}
			<Button
				variant="ghost"
				size="icon"
				onPress={toggleShuffle}
				className={isShuffled ? 'opacity-100' : 'opacity-50'}
			>
				<Icon as={ShuffleIcon} size={secondaryIconSize} />
			</Button>

			{}
			<Button variant="ghost" size="icon" onPress={skipToPrevious} disabled={isLoading}>
				<Icon as={SkipBackIcon} size={secondaryIconSize} />
			</Button>

			{}
			<Button
				variant="default"
				size="icon"
				onPress={togglePlayPause}
				disabled={isLoading}
				className="w-16 h-16 rounded-full"
			>
				<Icon as={PlayPauseIcon} size={32} className="text-primary-foreground" fill="currentColor" />
			</Button>

			{}
			<Button variant="ghost" size="icon" onPress={skipToNext} disabled={isLoading}>
				<Icon as={SkipForwardIcon} size={secondaryIconSize} />
			</Button>

			{}
			<Button
				variant="ghost"
				size="icon"
				onPress={cycleRepeatMode}
				className={repeatActive ? 'opacity-100' : 'opacity-50'}
			>
				<Icon as={RepeatIconComponent} size={secondaryIconSize} />
			</Button>
		</View>
	);
}
