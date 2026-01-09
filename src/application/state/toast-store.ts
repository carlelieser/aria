import { create } from 'zustand';

export type ToastVariant = 'default' | 'success' | 'error' | 'warning' | 'info';

export interface Toast {
	id: string;
	title: string;
	description?: string;
	variant: ToastVariant;
	duration: number;
}

interface ToastState {
	toasts: Toast[];

	show: (toast: Omit<Toast, 'id'>) => string;
	dismiss: (id: string) => void;
	dismissAll: () => void;
}

function generateId(): string {
	return `toast-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

const DEFAULT_DURATION = 4000;

export const useToastStore = create<ToastState>((set) => ({
	toasts: [],

	show: (toast) => {
		const id = generateId();
		const newToast: Toast = {
			...toast,
			id,
			duration: toast.duration ?? DEFAULT_DURATION,
		};

		set((state) => ({
			toasts: [...state.toasts, newToast],
		}));

		return id;
	},

	dismiss: (id) => {
		set((state) => ({
			toasts: state.toasts.filter((t) => t.id !== id),
		}));
	},

	dismissAll: () => {
		set({ toasts: [] });
	},
}));

export const useToasts = () => useToastStore((state) => state.toasts);
export const useCurrentToast = () =>
	useToastStore((state) => state.toasts[state.toasts.length - 1] ?? null);
