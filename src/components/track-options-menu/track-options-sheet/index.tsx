/**
 * TrackOptionsSheet Component
 *
 * Shared bottom sheet for track options menu.
 * Rendered once at app level and controlled via track-options-store.
 * Actions are pre-loaded before opening to prevent visual jumps.
 */

import React, { useRef, useCallback, useEffect } from 'react';
import {
	BottomSheetBackdrop,
	BottomSheetView,
	type BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';
import type { BottomSheetMethods } from '@gorhom/bottom-sheet/lib/typescript/types';
import { BottomSheetPortal } from '@/src/components/ui/bottom-sheet-portal';
import { useAppTheme } from '@/lib/theme';
import {
	useTrackOptionsStore,
	useTrackOptionsTrack,
	useTrackOptionsSource,
	useTrackOptionsContext,
	useIsTrackOptionsOpen,
} from '@/src/application/state/track-options-store';
import { TrackOptionsContent } from './track-options-content';
import { styles } from './styles';

export function TrackOptionsSheet() {
	const bottomSheetRef = useRef<BottomSheetMethods>(null);
	const { colors } = useAppTheme();

	const track = useTrackOptionsTrack();
	const source = useTrackOptionsSource();
	const context = useTrackOptionsContext();
	const isOpen = useIsTrackOptionsOpen();
	const close = useTrackOptionsStore((state) => state.close);

	useEffect(() => {
		if (isOpen && track) {
			bottomSheetRef.current?.snapToIndex(0);
		} else {
			bottomSheetRef.current?.close();
		}
	}, [isOpen, track]);

	const handleSheetChanges = useCallback(
		(index: number) => {
			if (index === -1) {
				close();
			}
		},
		[close]
	);

	const renderBackdrop = useCallback(
		(props: BottomSheetBackdropProps) => (
			<BottomSheetBackdrop
				{...props}
				disappearsOnIndex={-1}
				appearsOnIndex={0}
				opacity={0.5}
				pressBehavior={'close'}
			/>
		),
		[]
	);

	return (
		<BottomSheetPortal
			name={'track-options-sheet'}
			ref={bottomSheetRef}
			enablePanDownToClose
			snapPoints={['50%', '75%']}
			backdropComponent={renderBackdrop}
			onChange={handleSheetChanges}
			backgroundStyle={[styles.background, { backgroundColor: colors.surfaceContainerHigh }]}
			handleIndicatorStyle={[
				styles.handleIndicator,
				{ backgroundColor: colors.outlineVariant },
			]}
		>
			{track ? (
				<TrackOptionsContent
					track={track}
					source={source}
					playlistId={context.playlistId}
					trackPosition={context.trackPosition}
					onClose={() => bottomSheetRef.current?.close()}
				/>
			) : (
				<BottomSheetView style={styles.contentContainer}>{null}</BottomSheetView>
			)}
		</BottomSheetPortal>
	);
}
