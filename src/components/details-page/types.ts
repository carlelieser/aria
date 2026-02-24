/**
 * DetailsPage Types
 *
 * Shared types for the unified details page component used by
 * album, artist, and playlist screens.
 */

import type { ReactNode } from 'react';
import type { NativeSyntheticEvent, NativeScrollEvent } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';

export type ArtworkShape = 'square' | 'circular';

export interface DetailsHeaderInfo {
	readonly title: string;
	readonly artworkUrl?: string;
	readonly artworkShape?: ArtworkShape;
	readonly artworkSize?: number;
	readonly placeholderIcon: LucideIcon;
	readonly metadata?: readonly MetadataLine[];
	readonly actionButton?: ReactNode;
}

export interface MetadataLine {
	readonly text: string;
	readonly variant?: 'primary' | 'secondary';
}

export interface DetailsPageSection {
	readonly key: string;
	readonly title?: string;
	readonly content: ReactNode;
	readonly horizontal?: boolean;
}

export interface DetailsPageProps {
	readonly pageTitle?: string;
	readonly headerInfo: DetailsHeaderInfo;
	readonly headerRightActions?: ReactNode;
	readonly sections: readonly DetailsPageSection[];
	readonly isLoading?: boolean;
	readonly loadingContent?: ReactNode;
	readonly emptyContent?: ReactNode;
	readonly bottomContent?: ReactNode;
}

export interface RenderContentProps {
	readonly ListHeaderComponent: ReactNode;
	readonly onScroll: (e: NativeSyntheticEvent<NativeScrollEvent>) => void;
}

export interface ExtendedDetailsPageProps extends Omit<DetailsPageProps, 'sections'> {
	readonly sections?: readonly DetailsPageSection[];
	readonly children?: ReactNode;
	readonly renderContent?: (props: RenderContentProps) => ReactNode;
	readonly scrollContentStyle?: object;
	readonly disableScroll?: boolean;
}
