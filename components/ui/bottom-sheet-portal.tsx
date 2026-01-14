/**
 * BottomSheetPortal Component
 *
 * A wrapper for @gorhom/bottom-sheet that handles Portal rendering and
 * pointer event management. Keeps sheets always mounted to avoid freeze
 * bugs while allowing touches to pass through when closed.
 */

import React, { useState, useCallback, forwardRef } from 'react';
import { View, StyleSheet } from 'react-native';
import BottomSheet, { type BottomSheetProps } from '@gorhom/bottom-sheet';
import type { BottomSheetMethods } from '@gorhom/bottom-sheet/lib/typescript/types';
import { Portal } from '@rn-primitives/portal';

interface BottomSheetPortalProps extends Omit<BottomSheetProps, 'onChange'> {
	name: string;
	onChange?: (index: number) => void;
}

export const BottomSheetPortal = forwardRef<BottomSheetMethods, BottomSheetPortalProps>(
	function BottomSheetPortal({ name, onChange, children, ...props }, ref) {
		const [sheetIndex, setSheetIndex] = useState(-1);

		const handleSheetChanges = useCallback(
			(index: number) => {
				setSheetIndex(index);
				onChange?.(index);
			},
			[onChange]
		);

		const pointerEvents = sheetIndex === -1 ? 'none' : 'auto';

		return (
			<Portal name={name}>
				<View style={StyleSheet.absoluteFill} pointerEvents={pointerEvents}>
					<BottomSheet ref={ref} index={-1} onChange={handleSheetChanges} {...props}>
						{children}
					</BottomSheet>
				</View>
			</Portal>
		);
	}
);
