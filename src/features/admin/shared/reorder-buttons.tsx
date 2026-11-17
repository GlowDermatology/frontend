"use client";

import { useEffect, useRef } from "react";

import { IconButton } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { useCopy } from "@/lib/i18n/admin-context";

import { sharedCopy } from "./copy";

interface ReorderButtonsProps {
  /** The item's name, e.g. "Serumlar"; the copy quotes it per language. */
  subject: string;
  index: number;
  count: number;
  /** Returns `false` when the move was not taken (focus is then left alone). */
  onMove: (from: number, to: number) => boolean | void;
}

const buttonClass = "size-8 rounded-sm text-ink-muted hover:bg-gold-soft hover:text-ink";

/**
 * Up/down controls of an ordered row (categories, banners): a keyboard and
 * single-pointer alternative to dragging. The buttons stay enabled while the
 * order is saved (moves are coalesced by the list), and after a move focus
 * follows the row to its new place — on the same arrow, or on the other one
 * when the row reached an end — so Enter can be pressed repeatedly. Each
 * target is 32×32 px (WCAG 2.5.8). At an end the arrow stays focusable and
 * says why it does nothing (`disabledReason`).
 */
export function ReorderButtons({ subject, index, count, onMove }: ReorderButtonsProps) {
  const t = useCopy(sharedCopy).reorder;
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
      <IconButton
        ref={up}
        size="sm"
        aria-label={t.up(subject)}
        disabledReason={index === 0 && t.first}
        onClick={() => press("up")}
        className={buttonClass}
      >
        <Icon name="chevron-up" size={16} />
      </IconButton>
      <IconButton
        ref={down}
        size="sm"
        aria-label={t.down(subject)}
        disabledReason={index === count - 1 && t.last}
        onClick={() => press("down")}
        className={buttonClass}
      >
        <Icon name="chevron-down" size={16} />
      </IconButton>
    </span>
  );
}
