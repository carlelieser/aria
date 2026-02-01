/**
 * GenericListView Component
 *
 * A reusable list component that handles loading, empty, and data states.
 * Reduces boilerplate across all list-based screens.
 */

import type { ReactNode } from 'react';
import type { NativeSyntheticEvent, NativeScrollEvent } from 'react-native';
import { FlashList, type FlashListProps } from '@shopify/flash-list';
import { PlayerAwareFlashList } from '@/src/components/ui/player-aware-flash-list';
import { EmptyState } from './empty-state';
import type { LucideIcon } from 'lucide-react-native';

type ListRenderItem<T> = FlashListProps<T>['renderItem'];
type ContentStyle = FlashListProps<unknown>['contentContainerStyle'];
type ScrollHandler = (event: NativeSyntheticEvent<NativeScrollEvent>) => void;

interface EmptyStateConfig {
	icon: LucideIcon;
	title: string;
	description: string;
}

interface GenericListViewProps<T> {
	data: T[];
	isLoading: boolean;
	keyExtractor: (item: T) => string;
	renderItem: ListRenderItem<T>;
	loadingSkeleton: ReactNode;
	emptyState: EmptyStateConfig;
	filteredEmptyState?: EmptyStateConfig;
	hasFilters?: boolean;
	extraData?: unknown;
	contentContainerStyle?: ContentStyle;
	showsVerticalScrollIndicator?: boolean;
	disablePlayerAwarePadding?: boolean;
	onScroll?: ScrollHandler;
}

export function GenericListView<T>({
	data,
	isLoading,
	keyExtractor,
	renderItem,
	loadingSkeleton,
	emptyState,
	filteredEmptyState,
	hasFilters = false,
	extraData,
	contentContainerStyle,
	showsVerticalScrollIndicator = false,
	disablePlayerAwarePadding = false,
	onScroll,
}: GenericListViewProps<T>) {
	if (isLoading) {
		return <>{loadingSkeleton}</>;
	}

	if (data.length === 0) {
		const config = hasFilters && filteredEmptyState ? filteredEmptyState : emptyState;
		return (
			<EmptyState icon={config.icon} title={config.title} description={config.description} />
		);
	}

	const ListComponent = disablePlayerAwarePadding ? FlashList : PlayerAwareFlashList;

	return (
		<ListComponent
			data={data}
			keyExtractor={keyExtractor}
			renderItem={renderItem}
			showsVerticalScrollIndicator={showsVerticalScrollIndicator}
			extraData={extraData}
			contentContainerStyle={contentContainerStyle}
			onScroll={onScroll}
		/>
	);
}
