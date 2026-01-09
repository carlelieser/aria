import { View } from 'react-native';
import { Skeleton } from '@/components/ui/skeleton';

export function TrackListItemSkeleton() {
	return (
		<View className="flex flex-row items-center w-full gap-4 py-4">
			{}
			<Skeleton width={48} height={48} rounded="lg" />

			{}
			<View className="flex flex-col gap-2 flex-1">
				{}
				<Skeleton width="70%" height={16} rounded="sm" />
				{}
				<Skeleton width="50%" height={14} rounded="sm" />
			</View>

			{}
			<Skeleton width={36} height={14} rounded="sm" />

			{}
			<Skeleton width={24} height={24} rounded="full" />
		</View>
	);
}

interface TrackListSkeletonProps {
	count?: number;
}

export function TrackListSkeleton({ count = 6 }: TrackListSkeletonProps) {
	return (
		<View>
			{Array.from({ length: count }).map((_, index) => (
				<TrackListItemSkeleton key={index} />
			))}
		</View>
	);
}
