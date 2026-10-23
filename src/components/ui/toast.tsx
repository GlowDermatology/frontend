"use client";

import { createContext, use, useCallback, useEffect, useRef, useState, type ReactNode } from "react";

import { Icon } from "./icon";

export interface ToastInput {
  title: string;
  description?: string;
}

interface ToastItem extends ToastInput {
  id: number;
}

const ToastContext = createContext<((toast: ToastInput) => void) | null>(null);

const DISMISS_AFTER_MS = 6000;

/**
 * Success toasts in the top-right corner, as drawn on the canvas. The region is
 * a polite live region so screen readers announce each message once.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((t) => t.id !== id));
  }, []);

  const show = useCallback((toast: ToastInput) => {
    nextId.current += 1;
    const id = nextId.current;
    setToasts((current) => [...current.slice(-2), { ...toast, id }]);
  }, []);

  return (
    <ToastContext value={show}>
      {children}
      <div
        role="status"
        aria-live="polite"
        className="pointer-events-none fixed top-6 right-4 z-[60] flex w-[min(420px,calc(100%-32px))] flex-col items-end gap-2 sm:right-6"
      >
        {toasts.map((toast) => (
          <Toast key={toast.id} toast={toast} onDismiss={dismiss} />
        ))}
      </div>
    </ToastContext>
  );
}

function Toast({ toast, onDismiss }: { toast: ToastItem; onDismiss: (id: number) => void }) {
  useEffect(() => {
    const timer = window.setTimeout(() => onDismiss(toast.id), DISMISS_AFTER_MS);
    return () => window.clearTimeout(timer);
  }, [toast.id, onDismiss]);

  return (
    <div className="pointer-events-auto flex animate-toast-in items-center gap-3 rounded-md bg-surface-raised py-3.5 pr-2 pl-4 shadow-lg">
      <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-success-soft text-success">
        <Icon name="check" size={16} />
      </span>
      <span className="flex min-w-0 flex-col">
        <span className="text-[14px] leading-5 font-bold text-ink">{toast.title}</span>
        {toast.description && (
          <span className="text-caption font-normal text-ink-muted">{toast.description}</span>
        )}
      </span>
      <button
        type="button"
        aria-label="Yopish"
        onClick={() => onDismiss(toast.id)}
        className="ml-1 flex size-9 shrink-0 items-center justify-center rounded-md text-ink-muted hover:bg-gold-soft hover:text-ink"
      >
        <Icon name="close" size={18} />
      </button>
    </div>
  );
}

export function useToast(): (toast: ToastInput) => void {
  const show = use(ToastContext);
  if (!show) throw new Error("useToast must be used inside <ToastProvider>.");
  return show;
}
