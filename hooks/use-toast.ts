import { useCallback } from 'react';
import {
  useToastStore,
  type ToastVariant,
} from '@/src/application/state/toast-store';

interface ToastOptions {
  title: string;
  description?: string;
  variant?: ToastVariant;
  duration?: number;
}

interface UseToastReturn {
  toast: (options: ToastOptions) => string;
  success: (title: string, description?: string) => string;
  error: (title: string, description?: string) => string;
  warning: (title: string, description?: string) => string;
  info: (title: string, description?: string) => string;
  dismiss: (id: string) => void;
  dismissAll: () => void;
}

export function useToast(): UseToastReturn {
  const show = useToastStore((state) => state.show);
  const dismissAction = useToastStore((state) => state.dismiss);
  const dismissAllAction = useToastStore((state) => state.dismissAll);

  const toast = useCallback(
    (options: ToastOptions) => {
      return show({
        title: options.title,
        description: options.description,
        variant: options.variant ?? 'default',
        duration: options.duration ?? 4000,
      });
    },
    [show]
  );

  const success = useCallback(
    (title: string, description?: string) =>
      toast({ title, description, variant: 'success' }),
    [toast]
  );

  const error = useCallback(
    (title: string, description?: string) =>
      toast({ title, description, variant: 'error' }),
    [toast]
  );

  const warning = useCallback(
    (title: string, description?: string) =>
      toast({ title, description, variant: 'warning' }),
    [toast]
  );

  const info = useCallback(
    (title: string, description?: string) =>
      toast({ title, description, variant: 'info' }),
    [toast]
  );

  const dismiss = useCallback(
    (id: string) => dismissAction(id),
    [dismissAction]
  );

  const dismissAll = useCallback(() => dismissAllAction(), [dismissAllAction]);

  return {
    toast,
    success,
    error,
    warning,
    info,
    dismiss,
    dismissAll,
  };
}
