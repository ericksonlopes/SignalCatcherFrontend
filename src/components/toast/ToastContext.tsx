import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { ToastNotification } from '../../types';

interface ToastOptions {
  title?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface ToastContextType {
  toasts: ToastNotification[];
  showToast: (toast: Omit<ToastNotification, 'id'> & { id?: string }) => string;
  dismissToast: (id: string) => void;
  clearAllToasts: () => void;
  toast: {
    success: (message: string, title?: string, options?: ToastOptions) => string;
    error: (message: string, title?: string, options?: ToastOptions) => string;
    warning: (message: string, title?: string, options?: ToastOptions) => string;
    info: (message: string, title?: string, options?: ToastOptions) => string;
    dismiss: (id: string) => void;
    clearAll: () => void;
  };
}

const ToastContext = createContext<ToastContextType | null>(null);

const MAX_TOASTS = 3;
const DEFAULT_DURATION = 5000;

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastNotification[]>([]);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const clearAllToasts = useCallback(() => {
    setToasts([]);
  }, []);

  const showToast = useCallback(
    (item: Omit<ToastNotification, 'id'> & { id?: string }) => {
      const randomId = globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : Date.now().toString(36);
      const id = item.id || `toast-${Date.now()}-${randomId}`;
      const newToast: ToastNotification = {
        ...item,
        id,
        duration: item.duration ?? (item.type === 'error' ? 9000 : DEFAULT_DURATION),
        createdAt: item.createdAt || Date.now(),
      };

      setToasts((prev) => {
        // Keep max visible toasts to prevent overflowing
        const next = [newToast, ...prev.filter((t) => t.id !== id)];
        return next.slice(0, MAX_TOASTS);
      });

      return id;
    },
    []
  );

  const toast = useMemo(
    () => ({
      success: (message: string, title?: string, options?: ToastOptions) =>
        showToast({ type: 'success', message, title, ...options }),
      error: (message: string, title?: string, options?: ToastOptions) =>
        showToast({ type: 'error', message, title, ...options }),
      warning: (message: string, title?: string, options?: ToastOptions) =>
        showToast({ type: 'warning', message, title, ...options }),
      info: (message: string, title?: string, options?: ToastOptions) =>
        showToast({ type: 'info', message, title, ...options }),
      dismiss: dismissToast,
      clearAll: clearAllToasts,
    }),
    [showToast, dismissToast, clearAllToasts]
  );

  const contextValue = useMemo(
    () => ({
      toasts,
      showToast,
      dismissToast,
      clearAllToasts,
      toast,
    }),
    [toasts, showToast, dismissToast, clearAllToasts, toast]
  );

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
    </ToastContext.Provider>
  );
};

export const useToast = (): ToastContextType => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
