/**
 * DropdownMenu Context
 *
 * React context for sharing menu state between DropdownMenu and its child components.
 */

import React from 'react';
import type { DropdownMenuContextValue } from './types';

export const DropdownMenuContext = React.createContext<DropdownMenuContextValue | null>(null);

export function useDropdownMenuContext(): DropdownMenuContextValue {
	const context = React.useContext(DropdownMenuContext);
	if (!context) {
		throw new Error('DropdownMenu components must be used within DropdownMenu');
	}
	return context;
}
