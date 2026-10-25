"use client";

import { useEffect, useRef } from "react";

import { Icon } from "@/components/ui/icon";

interface ReorderButtonsProps {
  /** Accessible subject, e.g. "«Serumlar»". */
  subject: string;
  index: number;
  count: number;
  /** Returns `false` when the move was not taken (focus is then left alone). */
  onMove: (from: number, to: number) => boolean | void;
}

const buttonClass =
  "flex size-8 items-center justify-center rounded-sm text-ink-muted transition-colors duration-150 hover:bg-gold-soft hover:text-ink disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-ink-muted";

/**
 * Up/down controls of an ordered row (categories, banners): a keyboard and
 * single-pointer alternative to dragging. The buttons stay enabled while the
 * order is saved (moves are coalesced by the list), and after a move focus
 * follows the row to its new place — on the same arrow, or on the other one
 * when the row reached an end — so Enter can be pressed repeatedly. Each
 * target is 32×32 px (WCAG 2.5.8).
 */
export function ReorderButtons({ subject, index, count, onMove }: ReorderButtonsProps) {
  const up = useRef<HTMLButtonElement>(null);
  const down = useRef<HTMLButtonElement>(null);
  const pendingFocus = useRef<"up" | "down" | null>(null);

  useEffect(() => {
    const direction = pendingFocus.current;
    if (!direction) return;
    pendingFocus.current = null;
    const target = direction === "up" ? (index === 0 ? down : up) : index === count - 1 ? up : down;
    target.current?.focus();
  }, [index, count]);

  const press = (direction: "up" | "down") => {
    const to = direction === "up" ? index - 1 : index + 1;
    if (onMove(index, to) === false) return;
    pendingFocus.current = direction;
  };

  return (
    <span className="inline-flex items-center gap-1">
      <span className="w-6 text-right text-body-sm text-ink-muted tabular-nums">{index + 1}</span>
      <button
        type="button"
        ref={up}
        aria-label={`${subject} yuqoriga`}
        disabled={index === 0}
        onClick={() => press("up")}
        className={buttonClass}
      >
        <Icon name="chevron-up" size={16} />
      </button>
      <button
        type="button"
        ref={down}
        aria-label={`${subject} pastga`}
        disabled={index === count - 1}
        onClick={() => press("down")}
        className={buttonClass}
      >
        <Icon name="chevron-down" size={16} />
      </button>
    </span>
  );
}
