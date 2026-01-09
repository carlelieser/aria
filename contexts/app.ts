import { createContext } from 'react';
import { MusicResponsiveListItem } from '@/node_modules/youtubei.js/dist/src/parser/nodes';

export interface AppContextType {
	items: MusicResponsiveListItem[];
	playing: MusicResponsiveListItem | null;

	setPlaying: (value: MusicResponsiveListItem | null) => void;
}

export const AppContext = createContext<AppContextType>({
	items: [],
	playing: null,
	setPlaying: () => {},
});
