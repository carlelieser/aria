import { createContext, useContext } from 'react';
import type { ReactNode } from 'react';

interface HeaderActionsContextType {
	readonly extraActions?: ReactNode;
}

const HeaderActionsContext = createContext<HeaderActionsContextType>({});

export const HeaderActionsProvider = HeaderActionsContext.Provider;

export function useHeaderActions(): HeaderActionsContextType {
	return useContext(HeaderActionsContext);
}
