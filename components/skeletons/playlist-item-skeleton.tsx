import { View } from 'react-native';
import { Skeleton } from '@/components/ui/skeleton';

export function PlaylistItemSkeleton() {
	return (
		<View className="flex flex-row items-center w-full gap-4 py-4">
			{}
			<Skeleton width={56} height={56} rounded="lg" />

			{}
			<View className="flex flex-col gap-2 flex-1">
				{}
				<Skeleton width="60%" height={16} rounded="sm" />
				{}
				<Skeleton width="30%" height={14} rounded="sm" />
			</View>
		</View>
	);
}

interface PlaylistListSkeletonProps {
	count?: number;
}

export function PlaylistListSkeleton({ count = 5 }: PlaylistListSkeletonProps) {
	return (
		<View>
			{Array.from({ length: count }).map((_, index) => (
				<PlaylistItemSkeleton key={index} />
			))}
		</View>
	);
}
