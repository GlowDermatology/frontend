"use client";

import { useState } from "react";

/**
 * Pause / play for the hero showcase (WCAG 2.2.2): sets `data-paused` on the
 * stage, which pauses its CSS animations. Hidden on phones (the frames are a
 * swipeable row there) and under reduced motion (nothing moves).
 */
export function ShowcasePause({ pause, play }: { pause: string; play: string }) {
  const [paused, setPaused] = useState(false);
  return (
    <button
      type="button"
      aria-pressed={paused}
      aria-label={paused ? play : pause}
      title={paused ? play : pause}
      onClick={(event) => {
        const stage = event.currentTarget.closest<HTMLElement>("[data-spot]");
        const next = !paused;
        if (next) stage?.setAttribute("data-paused", "");
        else stage?.removeAttribute("data-paused");
        setPaused(next);
      }}
      className="flex size-9 shrink-0 items-center justify-center rounded-full border border-banner-ink-soft/25 bg-banner-ink-soft/5 text-banner-ink-soft transition-colors hover:bg-banner-ink-soft/15 motion-reduce:hidden"
    >
      {paused ? (
        <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <path d="M8 5.5v13l10-6.5-10-6.5Z" />
        </svg>
      ) : (
        <svg
          aria-hidden="true"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        >
          <path d="M9 6v12M15 6v12" />
        </svg>
      )}
    </button>
  );
}
