/**
 * ContentTypeChips Component
 *
 * Horizontal chip row for filtering by content type.
 * Uses M3 theming.
 */

import { View, StyleSheet } from 'react-native';
import { FilterChip } from '@/components/library/filter-chip';
import type { SearchContentType } from '@/src/domain/utils/search-filtering';

interface ContentTypeChipsProps {
	selected: SearchContentType;
	onChange: (type: SearchContentType) => void;
}

const CONTENT_TYPES: { type: SearchContentType; label: string }[] = [
	{ type: 'all', label: 'All' },
	{ type: 'tracks', label: 'Tracks' },
	{ type: 'albums', label: 'Albums' },
	{ type: 'artists', label: 'Artists' },
];

export function ContentTypeChips({ selected, onChange }: ContentTypeChipsProps) {
	return (
		<View style={styles.container}>
			{CONTENT_TYPES.map((item) => (
				<FilterChip
					key={item.type}
					label={item.label}
					selected={selected === item.type}
					onPress={() => onChange(item.type)}
				/>
			))}
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: 8,
	},
});
