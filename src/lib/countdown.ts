"use client";

import { useEffect, useState } from "react";

/**
 * Countdowns shared by the storefront (the one-time code's resend window)
 * and the admin panel (the time left until an approved campaign's send).
 * The pure helpers are unit-tested; the hooks re-render once a second.
 */

/** Seconds left of a window of `seconds` that opened at `startedAt` (ms); 0 once it closed. */
export function remainingSeconds(startedAt: number, seconds: number, now: number): number {
  return Math.max(0, Math.ceil(seconds - (now - startedAt) / 1000));
}

/** Whole seconds from `now` (ms) until the ISO instant `until`; 0 once it passed or when unreadable. */
export function secondsUntil(until: string | null | undefined, now: number): number {
  if (!until) return 0;
  const at = Date.parse(until);
  if (Number.isNaN(at)) return 0;
  return Math.max(0, Math.ceil((at - now) / 1000));
}

/** `m:ss` ("4:59", "0:07"); hours fold into the minutes ("65:00"). */
export function formatCountdown(seconds: number): string {
  const whole = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(whole / 60);
  const rest = whole % 60;
  return `${minutes}:${rest < 10 ? "0" : ""}${rest}`;
}

/** Re-renders every second while `active`, returning the current time (ms). */
function useTicking(active: boolean): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    setNow(Date.now());
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [active]);
  return now;
}

/** A countdown to `seconds` after the code was sent; 0 when a resend is allowed. */
export function useCountdown(sentAt: number | null, seconds: number): number {
  const now = useTicking(sentAt !== null);
  return sentAt === null ? 0 : remainingSeconds(sentAt, seconds, Math.max(now, sentAt));
}

/**
 * Seconds left until the ISO instant `until` (an approved campaign's
 * `dispatchAfter`), ticking once a second and 0 once it passed; the server
 * renders it from its own clock, the client from the browser's.
 */
export function useCountdownTo(until: string | null | undefined): number {
  const now = useTicking(Boolean(until));
  return secondsUntil(until, now);
}
