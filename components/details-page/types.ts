/**
 * DetailsPage Types
 *
 * Shared types for the unified details page component used by
 * album, artist, and playlist screens.
 */

import type { ReactNode } from 'react';
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
	readonly pageTitle: string;
	readonly headerInfo: DetailsHeaderInfo;
	readonly headerRightActions?: ReactNode;
	readonly sections: readonly DetailsPageSection[];
	readonly isLoading?: boolean;
	readonly loadingContent?: ReactNode;
	readonly emptyContent?: ReactNode;
	readonly bottomContent?: ReactNode;
	readonly compact?: boolean;
}
