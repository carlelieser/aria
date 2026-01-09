import { View } from 'react-native';
import { Skeleton } from '@/components/ui/skeleton';

export function ArtistItemSkeleton() {
	return (
		<View className="flex flex-row items-center w-full gap-4 py-4">
			{}
			<Skeleton width={56} height={56} rounded="full" />

			{}
			<View className="flex flex-col gap-2 flex-1">
				{}
				<Skeleton width="55%" height={16} rounded="sm" />
				{}
				<Skeleton width="25%" height={14} rounded="sm" />
			</View>
		</View>
	);
}

interface ArtistListSkeletonProps {
	count?: number;
}

export function ArtistListSkeleton({ count = 5 }: ArtistListSkeletonProps) {
	return (
		<View>
			{Array.from({ length: count }).map((_, index) => (
				<ArtistItemSkeleton key={index} />
			))}
		</View>
	);
}
