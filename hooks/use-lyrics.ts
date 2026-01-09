import { useCallback, useEffect, useRef } from 'react';
import { useLyricsStore } from '@/src/application/state/lyrics-store';
import { usePlayerStore } from '@/src/application/state/player-store';
import { lyricsService } from '@/src/application/services/lyrics-service';
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
		const { clear, setLoading, setLyrics, setError } =
			useLyricsStore.getState();

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

			const result = await lyricsService.getLyrics(currentTrack.id);

			if (result.success) {
				setLyrics(result.data, currentTrack.id);
			} else {
				setError(result.error.message);
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
		const newIndex = lyricsService.findCurrentLineIndex(lyrics, positionMs);

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
			const result = await lyricsService.getLyrics(track.id);

			if (result.success) {
				setLyrics(result.data, track.id);
			} else {
				setError(result.error.message);
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
