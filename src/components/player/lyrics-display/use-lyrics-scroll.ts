/**
 * useLyricsScroll Hook
 *
 * Manages auto-scroll behavior for synced lyrics, pausing during
 * user interaction and resuming after a timeout.
 */

import { useRef, useEffect, useCallback } from 'react';
import type { ScrollView } from 'react-native';

const LINE_HEIGHT = 32;
const USER_SCROLL_RESUME_DELAY = 3000;

export function useLyricsScroll(currentLineIndex: number, hasSyncedLyrics: boolean) {
	const scrollViewRef = useRef<ScrollView>(null);
	const isUserScrolling = useRef(false);
	const scrollTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

	const handleScrollBegin = useCallback(() => {
		isUserScrolling.current = true;
		if (scrollTimeout.current) {
			clearTimeout(scrollTimeout.current);
		}
	}, []);

	const handleScrollEnd = useCallback(() => {
		scrollTimeout.current = setTimeout(() => {
			isUserScrolling.current = false;
		}, USER_SCROLL_RESUME_DELAY);
	}, []);

	useEffect(() => {
		return () => {
			if (scrollTimeout.current) {
				clearTimeout(scrollTimeout.current);
			}
		};
	}, []);

	useEffect(() => {
		if (
			!isUserScrolling.current &&
			currentLineIndex >= 0 &&
			scrollViewRef.current &&
			hasSyncedLyrics
		) {
			const scrollY = Math.max(0, currentLineIndex * LINE_HEIGHT - LINE_HEIGHT * 2);
			scrollViewRef.current.scrollTo({ y: scrollY, animated: true });
		}
	}, [currentLineIndex, hasSyncedLyrics]);

	return { scrollViewRef, handleScrollBegin, handleScrollEnd };
}
