import { useCallback, useEffect, useRef } from 'react';
import { useLyricsStore } from '@/src/application/state/lyrics-store';
import { usePlayerStore } from '@/src/application/state/player-store';
import { lyricsService } from '@/src/application/services/lyrics-service';
import { getLyricsPlugin } from '@/src/plugins/lyrics/core';
import type { Track } from '@/src/domain/entities/track';

/**
 * Side-effect driver for lyrics: fetches lyrics on track change and keeps the
 * active-line index in sync with playback. Mount ONCE (e.g. in the player).
 *
 * It deliberately holds no reactive subscription to position/status — those
 * change many times per second, and subscribing reactively would re-render the
 * host on every tick. It reads the player store imperatively instead.
 */
export function useLyricsSync() {
	const currentTrack = usePlayerStore((state) => state.currentTrack);
	const lyrics = useLyricsStore((state) => state.lyrics);
	const lastTrackIdRef = useRef<string | null>(null);

	useEffect(() => {
		const { clear, setLoading, setLyrics, setError } = useLyricsStore.getState();

		if (!currentTrack) {
			clear();
			lastTrackIdRef.current = null;
			return;
		}

		const trackIdValue = currentTrack.id.value;

		if (lastTrackIdRef.current === trackIdValue) {
			return;
		}

		lastTrackIdRef.current = trackIdValue;

		const fetchLyrics = async () => {
			setLoading(true);

			const plugin = getLyricsPlugin();
			if (!plugin) {
				setError('Lyrics plugin is not available');
				return;
			}

			try {
				const fetched = await plugin.getLyrics(currentTrack);
				setLyrics(fetched, currentTrack.id);
			} catch (err) {
				setError(err instanceof Error ? err.message : 'Failed to fetch lyrics');
			}
		};

		fetchLyrics();
	}, [currentTrack]);

	// Drive the active-line index from playback position WITHOUT subscribing to
	// position reactively. We subscribe to the player store imperatively: each
	// position/status change re-anchors a local clock, and a requestAnimationFrame
	// loop interpolates between the sparse ticks so the active line tracks the
	// audio smoothly without lagging.
	useEffect(() => {
		if (!lyrics?.syncedLyrics) {
			return;
		}

		let anchorMs = usePlayerStore.getState().position.totalMilliseconds;
		let anchorAt = Date.now();
		let frame: number | null = null;

		const apply = (positionMs: number) => {
			const newIndex = lyricsService.findCurrentLineIndex(lyrics, positionMs);
			if (newIndex !== useLyricsStore.getState().currentLineIndex) {
				useLyricsStore.getState().setCurrentLineIndex(newIndex);
			}
		};

		const tick = () => {
			apply(anchorMs + (Date.now() - anchorAt));
			frame = requestAnimationFrame(tick);
		};

		const sync = () => {
			const { position, status } = usePlayerStore.getState();
			anchorMs = position.totalMilliseconds;
			anchorAt = Date.now();
			apply(anchorMs);

			const shouldRun = status === 'playing';
			if (shouldRun && frame === null) {
				frame = requestAnimationFrame(tick);
			} else if (!shouldRun && frame !== null) {
				cancelAnimationFrame(frame);
				frame = null;
			}
		};

		sync();
		const unsubscribe = usePlayerStore.subscribe(sync);

		return () => {
			unsubscribe();
			if (frame !== null) {
				cancelAnimationFrame(frame);
			}
		};
	}, [lyrics]);
}

/** Reactive lyrics data for display components. */
export function useLyrics() {
	const lyrics = useLyricsStore((state) => state.lyrics);
	const currentLineIndex = useLyricsStore((state) => state.currentLineIndex);
	const isLoading = useLyricsStore((state) => state.isLoading);
	const error = useLyricsStore((state) => state.error);
	const isExpanded = useLyricsStore((state) => state.isExpanded);

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

			const plugin = getLyricsPlugin();
			if (!plugin) {
				setError('Lyrics plugin is not available');
				return;
			}

			try {
				const lyrics = await plugin.getLyrics(track);
				setLyrics(lyrics, track.id);
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
