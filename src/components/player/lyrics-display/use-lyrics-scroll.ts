/**
 * useLyricsScroll Hook
 *
 * Manages auto-scroll behavior for synced lyrics, pausing during
 * user interaction and resuming after a timeout.
 */

import { useRef, useEffect, useCallback } from 'react';
import type { ScrollView } from 'react-native';

const USER_SCROLL_RESUME_DELAY = 3000;

export function useLyricsScroll(currentLineIndex: number, hasSyncedLyrics: boolean) {
	const scrollViewRef = useRef<ScrollView>(null);
	const isUserScrolling = useRef(false);
	const scrollTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
	const lineLayouts = useRef<Map<number, { y: number; height: number }>>(new Map());
	const viewportHeight = useRef(0);

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

	const handleLineLayout = useCallback((index: number, y: number, height: number) => {
		lineLayouts.current.set(index, { y, height });
	}, []);

	const handleViewportLayout = useCallback((height: number) => {
		viewportHeight.current = height;
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
			isUserScrolling.current ||
			currentLineIndex < 0 ||
			!scrollViewRef.current ||
			!hasSyncedLyrics
		) {
			return;
		}

		const layout = lineLayouts.current.get(currentLineIndex);
		if (!layout) {
			return;
		}

		// Center the active line in the viewport using its measured position,
		// so lines that wrap to multiple rows still scroll accurately.
		const lineCenter = layout.y + layout.height / 2;
		const scrollY = Math.max(0, lineCenter - viewportHeight.current / 2);
		scrollViewRef.current.scrollTo({ y: scrollY, animated: true });
	}, [currentLineIndex, hasSyncedLyrics]);

	return {
		scrollViewRef,
		handleScrollBegin,
		handleScrollEnd,
		handleLineLayout,
		handleViewportLayout,
	};
}
