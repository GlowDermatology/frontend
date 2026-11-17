"use client";

import type { Route } from "next";
import Link from "next/link";
import {
  createContext,
  use,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { cn } from "@/lib/cn";
import { useCopy } from "@/lib/i18n/admin-context";

import { kitCopy } from "./copy";
import { Icon, type IconName } from "./icon";

/**
 * `success` confirms a completed action; `info` explains why nothing happened; `warning` says the
 * action worked only in part or needs attention; `danger` reports a failure.
 */
export type ToastTone = "success" | "info" | "warning" | "danger";

export interface ToastAction {
  label: string;
  /** In-app link (closes the toast on click). */
  href?: Route;
  /** Runs on click (closes the toast). */
  onClick?: () => void;
}

export interface ToastInput {
  title: string;
  description?: string;
  /** Defaults to `success`. */
  tone?: ToastTone;
  /** One follow-up, e.g. «Ko‘rish» or «Qaytarish». */
  action?: ToastAction;
  /**
   * Milliseconds before it closes, or `"sticky"` (stays until closed). Defaults: 6 s for
   * success/info, 10 s for warning/danger. The timer pauses while the pointer or focus is on it.
   */
  duration?: number | "sticky";
  /**
   * Announce a warning or failure politely (`role="status"`) though it keeps its tone: for a
   * failed save whose `FormErrorSummary` (`role="alert"`) already interrupts while the focus
   * moves to the field, so a second assertive message would compete with both.
   */
  polite?: boolean;
}

interface ToastItem extends ToastInput {
  id: number;
}

/** Default lifetime per tone (warnings and failures stay longer: they need reading). */
export function toastDuration(toast: Pick<ToastInput, "tone" | "duration">): number | null {
  if (toast.duration === "sticky") return null;
  if (typeof toast.duration === "number") return toast.duration;
  return toast.tone === "warning" || toast.tone === "danger" ? 10_000 : 6_000;
}

/** Warnings and failures go to the assertive `role="alert"` region, the rest to `role="status"`. */
export function isUrgentTone(tone: ToastTone | undefined): boolean {
  return tone === "warning" || tone === "danger";
}

/** The live region a toast is announced in (`polite` sends a failure to `status`). */
export function toastRegion(toast: Pick<ToastInput, "tone" | "polite">): "alert" | "status" {
  return isUrgentTone(toast.tone) && !toast.polite ? "alert" : "status";
}

const TONES: Record<ToastTone, { icon: IconName; chip: string }> = {
  success: { icon: "check", chip: "bg-success-soft text-success" },
  info: { icon: "info", chip: "bg-gold-soft text-gold-ink" },
  warning: { icon: "alert-triangle", chip: "bg-warning-soft text-warning" },
  danger: { icon: "alert-circle", chip: "bg-danger-soft text-danger" },
};

const MAX_VISIBLE = 3;

type Show = (toast: ToastInput) => void;

const ToastContext = createContext<Show | null>(null);

/**
 * Toasts in the top-right corner, as drawn on the canvas. Success and info messages sit in a
 * polite `role="status"` region; warnings and failures in a separate `role="alert"` region so
 * they interrupt. Each toast carries `data-toast` (and `data-tone`) for tests.
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
    setToasts((current) => [...current.slice(-(MAX_VISIBLE - 1)), { ...toast, id }]);
  }, []);

  const urgent = toasts.filter((toast) => toastRegion(toast) === "alert");
  const calm = toasts.filter((toast) => toastRegion(toast) === "status");

  return (
    <ToastContext value={show}>
      {children}
      {/* Both live regions stay rendered (never `display: none`) so screen readers keep them
          registered; the gap between them only appears when both hold a toast. */}
      <div className="pointer-events-none fixed top-6 right-4 z-[60] flex w-[min(420px,calc(100%-32px))] flex-col items-end sm:right-6">
        <div role="alert" className="flex w-full flex-col items-end gap-2">
          {urgent.map((toast) => (
            <Toast key={toast.id} toast={toast} onDismiss={dismiss} />
          ))}
        </div>
        <div
          role="status"
          aria-live="polite"
          className="flex w-full flex-col items-end gap-2 [[role=alert]:not(:empty)+&]:mt-2"
        >
          {calm.map((toast) => (
            <Toast key={toast.id} toast={toast} onDismiss={dismiss} />
          ))}
        </div>
      </div>
    </ToastContext>
  );
}

function Toast({ toast, onDismiss }: { toast: ToastItem; onDismiss: (id: number) => void }) {
  const t = useCopy(kitCopy);
  const tone = toast.tone ?? "success";
  const lifetime = toastDuration(toast);
  const [paused, setPaused] = useState(false);
  const remaining = useRef(lifetime);

  useEffect(() => {
    if (paused || remaining.current === null) return;
    const started = Date.now();
    const timer = window.setTimeout(() => onDismiss(toast.id), remaining.current);
    return () => {
      window.clearTimeout(timer);
      if (remaining.current !== null) {
        remaining.current = Math.max(1000, remaining.current - (Date.now() - started));
      }
    };
  }, [paused, toast.id, onDismiss]);

  const close = () => onDismiss(toast.id);
  const action = toast.action;
  const actionClass =
    "mt-1 self-start rounded-sm text-[13px] leading-[18px] font-bold text-gold-ink underline decoration-gold/50 underline-offset-4 hover:decoration-gold";

  return (
    <div
      data-toast=""
      data-tone={tone}
      onPointerEnter={() => setPaused(true)}
      onPointerLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setPaused(false);
      }}
      className="pointer-events-auto flex w-fit max-w-full animate-toast-in items-start gap-3 rounded-md border border-line bg-surface-raised py-3.5 pr-2 pl-4 shadow-lg"
    >
      <span
        className={cn(
          "mt-px flex size-7 shrink-0 items-center justify-center rounded-full",
          TONES[tone].chip,
        )}
      >
        <Icon name={TONES[tone].icon} size={16} />
      </span>
      <span className="flex min-w-0 flex-1 flex-col self-center">
        <span className="text-[14px] leading-5 font-bold text-ink">{toast.title}</span>
        {toast.description && (
          <span className="text-caption font-normal text-ink-muted">{toast.description}</span>
        )}
        {action &&
          (action.href ? (
            <Link
              href={action.href}
              onClick={() => {
                action.onClick?.();
                close();
              }}
              className={actionClass}
            >
              {action.label}
            </Link>
          ) : (
            <button
              type="button"
              onClick={() => {
                action.onClick?.();
                close();
              }}
              className={actionClass}
            >
              {action.label}
            </button>
          ))}
      </span>
      <button
        type="button"
        aria-label={t.close}
        onClick={close}
        className="ml-1 flex size-9 shrink-0 items-center justify-center rounded-md text-ink-muted hover:bg-gold-soft hover:text-ink"
      >
        <Icon name="close" size={18} />
      </button>
    </div>
  );
}

export function useToast(): Show {
  const show = use(ToastContext);
  if (!show) throw new Error("useToast must be used inside <ToastProvider>.");
  return show;
}

/** `useToast` for shared hooks that also run outside a provider (tests, the sign-in page). */
export function useOptionalToast(): Show | null {
  return use(ToastContext);
}
