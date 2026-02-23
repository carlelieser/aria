import { View, StyleSheet } from 'react-native';
import { Skeleton } from '@/src/components/ui/skeleton';

export function FeedSectionSkeleton() {
	return (
		<View style={styles.section}>
			<View style={styles.header}>
				<Skeleton width={'15%'} height={14} rounded={'sm'} />
			</View>
			<View style={styles.cards}>
				{Array.from({ length: 4 }).map((_, index) => (
					<View key={index} style={styles.card}>
						<Skeleton width={128} height={128} rounded={'lg'} />
						<Skeleton width={100} height={14} rounded={'sm'} />
						<Skeleton width={72} height={14} rounded={'sm'} />
					</View>
				))}
			</View>
		</View>
	);
}

export function HomeFeedSkeleton() {
	return (
		<View style={styles.container}>
			<View style={styles.chipRow}>
				{Array.from({ length: 4 }).map((_, index) => (
					<Skeleton key={index} width={80} height={32} rounded={'md'} />
				))}
			</View>
			{Array.from({ length: 4 }).map((_, index) => (
				<FeedSectionSkeleton key={index} />
			))}
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		gap: 24,
		paddingTop: 8,
	},
	chipRow: {
		flexDirection: 'row',
		paddingHorizontal: 16,
		gap: 8,
	},
	section: {
		gap: 12,
	},
	header: {
		paddingHorizontal: 16,
	},
	cards: {
		flexDirection: 'row',
		paddingHorizontal: 16,
		gap: 12,
	},
	card: {
		gap: 8,
	},
});
