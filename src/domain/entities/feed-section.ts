import type { Track } from './track';
import type { Album } from './album';
import type { Artist } from './artist';
import type { Artwork } from '../value-objects/artwork';

export interface FeedPlaylist {
	readonly id: string;
	readonly name: string;
	readonly artwork?: Artwork[];
	readonly subtitle?: string;
}

export type FeedItem =
	| { readonly type: 'track'; readonly data: Track }
	| { readonly type: 'album'; readonly data: Album }
	| { readonly type: 'artist'; readonly data: Artist }
	| { readonly type: 'playlist'; readonly data: FeedPlaylist };

export interface FeedSection {
	readonly id: string;
	readonly title: string;
	readonly subtitle?: string;
	readonly items: FeedItem[];
	readonly source: 'local' | 'remote';
}

export interface FeedFilterChip {
	readonly text: string;
	readonly isSelected: boolean;
}

export interface HomeFeedData {
	readonly sections: FeedSection[];
	readonly filterChips: FeedFilterChip[];
	readonly hasContinuation: boolean;
}
