import { View, Pressable } from 'react-native';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Check, ArrowUp, ArrowDown } from 'lucide-react-native';
import type { SortField, SortDirection } from '@/src/domain/utils/track-filtering';

interface SortSectionProps {
	sortField: SortField;
	sortDirection: SortDirection;
	onSortFieldChange: (field: SortField) => void;
	onToggleDirection: () => void;
}

const SORT_OPTIONS: { field: SortField; label: string }[] = [
	{ field: 'title', label: 'Title' },
	{ field: 'artist', label: 'Artist' },
	{ field: 'dateAdded', label: 'Date Added' },
	{ field: 'duration', label: 'Duration' },
];

export function SortSection({
	sortField,
	sortDirection,
	onSortFieldChange,
	onToggleDirection,
}: SortSectionProps) {
	return (
		<View className="gap-3">
			<View className="flex-row items-center justify-between">
				<Text className="text-sm font-medium text-muted-foreground uppercase">Sort by</Text>
				<Button
					variant="ghost"
					size="sm"
					className="flex-row gap-1"
					onPress={onToggleDirection}
				>
					<Icon
						as={sortDirection === 'asc' ? ArrowUp : ArrowDown}
						size={16}
						className="text-foreground"
					/>
					<Text className="text-sm">
						{sortDirection === 'asc' ? 'Ascending' : 'Descending'}
					</Text>
				</Button>
			</View>
			<View className="gap-1">
				{SORT_OPTIONS.map((option) => {
					const isSelected = sortField === option.field;
					return (
						<Pressable
							key={option.field}
							className="flex-row items-center justify-between py-2.5 px-1"
							onPress={() => onSortFieldChange(option.field)}
						>
							<Text className={isSelected ? 'font-medium' : ''}>{option.label}</Text>
							{isSelected && <Icon as={Check} size={18} className="text-primary" />}
						</Pressable>
					);
				})}
			</View>
		</View>
	);
}
