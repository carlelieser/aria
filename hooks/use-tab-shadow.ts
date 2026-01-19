/**
 * useTabShadow Hook
 *
 * Provides shadow styling for tab bars based on scroll position.
 * Shadow appears when content is scrolled past the threshold.
 */

import { useState, useCallback, useEffect } from 'react';
import type { NativeSyntheticEvent, NativeScrollEvent, ViewStyle } from 'react-native';

const SHADOW_SCROLL_THRESHOLD = 5;

const SHADOW_STYLE: ViewStyle = {
	shadowColor: '#000',
	shadowOffset: { width: 0, height: 2 },
	shadowOpacity: 0.05,
	shadowRadius: 4,
	elevation: 1,
};

interface UseTabShadowOptions {
	/** Current tab index - resets shadow when tab changes */
	tabIndex?: number;
}

interface UseTabShadowResult {
	/** Whether shadow should be shown */
	showShadow: boolean;
	/** Scroll handler to pass to scrollable components */
	handleScroll: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
	/** Shadow style to apply when showShadow is true */
	shadowStyle: ViewStyle | undefined;
}

export function useTabShadow(options: UseTabShadowOptions = {}): UseTabShadowResult {
	const { tabIndex } = options;
	const [showShadow, setShowShadow] = useState(false);

	useEffect(() => {
		setShowShadow(false);
	}, [tabIndex]);

	const handleScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
		const offsetY = event.nativeEvent.contentOffset.y;
		setShowShadow(offsetY > SHADOW_SCROLL_THRESHOLD);
	}, []);

	return {
		showShadow,
		handleScroll,
		shadowStyle: showShadow ? SHADOW_STYLE : undefined,
	};
}
