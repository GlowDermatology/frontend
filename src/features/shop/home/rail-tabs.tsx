"use client";

import { useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";

import { cn } from "@/lib/cn";

interface RailTab {
  key: string;
  label: string;
  count: string;
  /** The rail's cards, rendered on the server. */
  panel: ReactNode;
}

/**
 * The home's product rails as tabs (WAI-ARIA tabs: arrow keys, Home/End,
 * automatic activation). Only the switching lives here; every panel is
 * server-rendered and only hidden, so the cards and their images are in
 * the HTML from the start. Without JavaScript the first rail shows.
 */
export function RailTabs({ label, tabs }: { label: string; tabs: RailTab[] }) {
  const [active, setActive] = useState(0);
  const base = useId();
  const buttons = useRef<Array<HTMLButtonElement | null>>([]);

  const focus = (index: number) => {
    const next = (index + tabs.length) % tabs.length;
    setActive(next);
    buttons.current[next]?.focus();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const moves: Record<string, number> = {
      ArrowRight: index + 1,
      ArrowLeft: index - 1,
      Home: 0,
      End: tabs.length - 1,
    };
    const target = moves[event.key];
    if (target === undefined) return;
    event.preventDefault();
    focus(target);
  };

  return (
    <div className="flex flex-col gap-6">
      {tabs.length > 1 ? (
        <div
          role="tablist"
          aria-label={label}
          className="flex w-fit max-w-full flex-wrap gap-1.5 self-start rounded-full border border-line bg-surface-raised p-1 sm:self-end"
        >
          {tabs.map((tab, index) => {
            const selected = index === active;
            return (
              <button
                key={tab.key}
                ref={(node) => {
                  buttons.current[index] = node;
                }}
                id={`${base}-tab-${tab.key}`}
                type="button"
                role="tab"
                aria-selected={selected}
                aria-controls={`${base}-panel-${tab.key}`}
                tabIndex={selected ? 0 : -1}
                onClick={() => setActive(index)}
                onKeyDown={(event) => onKeyDown(event, index)}
                className={cn(
                  "inline-flex h-10 items-center gap-2 rounded-full px-4 text-label transition-colors",
                  selected ? "bg-gold text-on-gold" : "text-ink hover:bg-gold-soft",
                )}
              >
                {tab.label}
                <span className="text-caption font-semibold tabular-nums opacity-75">
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>
      ) : null}
      {tabs.map((tab, index) => (
        <div
          key={tab.key}
          id={`${base}-panel-${tab.key}`}
          role={tabs.length > 1 ? "tabpanel" : undefined}
          aria-labelledby={tabs.length > 1 ? `${base}-tab-${tab.key}` : undefined}
          hidden={index !== active}
        >
          {tab.panel}
        </div>
      ))}
    </div>
  );
}
