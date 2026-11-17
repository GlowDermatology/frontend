"use client";

import { useEffect, useState } from "react";

/** `m:ss` of a number of seconds (negative reads as 0:00). Pure. */
export function formatClock(seconds: number): string {
  const total = Math.max(0, Math.ceil(seconds));
  const minutes = Math.floor(total / 60);
  const rest = total % 60;
  return `${minutes}:${String(rest).padStart(2, "0")}`;
}

/**
 * Seconds left until `deadlineMs`, ticking once a second. The server and the first client render
 * agree on `initialSeconds` (deadline − the server's now), so hydration matches; from then on the
 * browser's own clock measures the elapsed time, so a skewed device clock cannot shorten or
 * lengthen the window. `null` deadline → `null`.
 *
 * `restart` starts the count again from `initialSeconds` when it changes (a new 429 answer with
 * the same wait).
 */
export function useCountdown(initialSeconds: number | null, restart: unknown = 0): number | null {
  const [left, setLeft] = useState(initialSeconds);
  const [source, setSource] = useState({ initialSeconds, restart });
  if (source.initialSeconds !== initialSeconds || source.restart !== restart) {
    setSource({ initialSeconds, restart });
    setLeft(initialSeconds);
  }
  useEffect(() => {
    if (initialSeconds === null) return;
    const started = Date.now();
    const tick = () => {
      const value = Math.max(0, initialSeconds - (Date.now() - started) / 1000);
      setLeft(Math.ceil(value));
      return value;
    };
    const timer = window.setInterval(() => {
      if (tick() <= 0) window.clearInterval(timer);
    }, 1000);
    return () => window.clearInterval(timer);
  }, [initialSeconds, restart]);
  return left;
}
