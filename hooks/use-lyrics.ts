import { useCallback, useEffect, useRef } from 'react';
import { useLyricsStore } from '@/src/application/state/lyrics-store';
import { usePlayerStore } from '@/src/application/state/player-store';
import { getLyricsPlugin } from '@/src/plugins/lyrics';
import { findCurrentLineIndex } from '@/src/plugins/lyrics/services/lyrics-utils';
import type { Track } from '@/src/domain/entities/track';

export function useLyrics() {
	const lyrics = useLyricsStore((state) => state.lyrics);
	const currentLineIndex = useLyricsStore((state) => state.currentLineIndex);
	const isLoading = useLyricsStore((state) => state.isLoading);
	const error = useLyricsStore((state) => state.error);
	const isExpanded = useLyricsStore((state) => state.isExpanded);

	const currentTrack = usePlayerStore((state) => state.currentTrack);
	const position = usePlayerStore((state) => state.position);
	const lastTrackIdRef = useRef<string | null>(null);

	// Fetch lyrics when track changes
	useEffect(() => {
		const { clear, setLoading, setLyrics, setError } = useLyricsStore.getState();

		if (!currentTrack) {
			clear();
			lastTrackIdRef.current = null;
			return;
		}

		const trackIdValue = currentTrack.id.value;

		// Skip if same track
		if (lastTrackIdRef.current === trackIdValue) {
			return;
		}

		lastTrackIdRef.current = trackIdValue;

		const fetchLyrics = async () => {
			setLoading(true);

			const lyricsPlugin = getLyricsPlugin();
			if (!lyricsPlugin) {
				setError('Lyrics plugin not initialized');
				return;
			}

			try {
				const result = await lyricsPlugin.getLyrics(currentTrack);
				setLyrics(result, currentTrack.id);
			} catch (err) {
				setError(err instanceof Error ? err.message : 'Failed to fetch lyrics');
			}
		};

		fetchLyrics();
	}, [currentTrack]);

	// Update current line index based on position
	useEffect(() => {
		if (!lyrics?.syncedLyrics) {
			return;
		}

		const positionMs = position.totalMilliseconds;
		const newIndex = findCurrentLineIndex(lyrics, positionMs);

		if (newIndex !== currentLineIndex) {
			useLyricsStore.getState().setCurrentLineIndex(newIndex);
		}
	}, [position, lyrics, currentLineIndex]);

	const toggleExpanded = useCallback(() => {
		useLyricsStore.getState().toggleExpanded();
	}, []);

	const setExpanded = useCallback((expanded: boolean) => {
		useLyricsStore.getState().setExpanded(expanded);
	}, []);

	return {
		lyrics,
		currentLineIndex,
		isLoading,
		error,
		isExpanded,

		hasSyncedLyrics: !!lyrics?.syncedLyrics?.length,
		hasPlainLyrics: !!lyrics?.plainLyrics,
		hasAnyLyrics: !!lyrics?.syncedLyrics?.length || !!lyrics?.plainLyrics,

		toggleExpanded,
		setExpanded,
	};
}

export function useLyricsForTrack(track: Track | null) {
	const lyrics = useLyricsStore((state) => state.lyrics);
	const isLoading = useLyricsStore((state) => state.isLoading);
	const error = useLyricsStore((state) => state.error);

	useEffect(() => {
		if (!track) {
			return;
		}

		const { setLoading, setLyrics, setError } = useLyricsStore.getState();

		const fetchLyrics = async () => {
			setLoading(true);

			const lyricsPlugin = getLyricsPlugin();
			if (!lyricsPlugin) {
				setError('Lyrics plugin not initialized');
				return;
			}

			try {
				const result = await lyricsPlugin.getLyrics(track);
				setLyrics(result, track.id);
			} catch (err) {
				setError(err instanceof Error ? err.message : 'Failed to fetch lyrics');
			}
		};

		fetchLyrics();
	}, [track]);

	return {
		lyrics,
		isLoading,
		error,
	};
}
