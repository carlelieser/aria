import { create } from 'zustand';

/**
 * Toast variant types
 */
export type ToastVariant = 'default' | 'success' | 'error' | 'warning' | 'info';

/**
 * Toast data structure
 */
export interface Toast {
  id: string;
  title: string;
  description?: string;
  variant: ToastVariant;
  duration: number;
}

/**
 * Toast store state shape
 */
interface ToastState {
  // State
  toasts: Toast[];

  // Actions
  show: (toast: Omit<Toast, 'id'>) => string;
  dismiss: (id: string) => void;
  dismissAll: () => void;
}

/**
 * Generate unique toast ID
 */
function generateId(): string {
  return `toast-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Default toast duration in milliseconds
 */
const DEFAULT_DURATION = 4000;

/**
 * Toast store for managing toast notifications
 */
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

/**
 * Selector hooks for common state queries
 */
export const useToasts = () => useToastStore((state) => state.toasts);
export const useCurrentToast = () =>
  useToastStore((state) => state.toasts[state.toasts.length - 1] ?? null);
