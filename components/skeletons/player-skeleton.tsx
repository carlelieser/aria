import { View } from 'react-native';
import { Skeleton } from '@/components/ui/skeleton';

export function PlayerArtworkSkeleton() {
	return (
		<View className="w-full aspect-square">
			<Skeleton rounded="2xl" className="flex-1 w-full h-full" />
		</View>
	);
}

export function PlayerBufferingOverlay() {
	return (
		<View className="absolute inset-0 items-center justify-center bg-background/60 rounded-2xl">
			<Skeleton width={80} height={80} rounded="full" />
		</View>
	);
}

export function PlayerTrackInfoSkeleton() {
	return (
		<View className="gap-3 mt-8 mb-6">
			{}
			<Skeleton width="80%" height={28} rounded="md" />
			{}
			<Skeleton width="50%" height={20} rounded="sm" />
			{}
			<Skeleton width="40%" height={16} rounded="sm" />
		</View>
	);
}

export function PlayerSkeleton() {
	return (
		<View className="flex-1 px-8">
			<PlayerArtworkSkeleton />
			<PlayerTrackInfoSkeleton />
		</View>
	);
}
