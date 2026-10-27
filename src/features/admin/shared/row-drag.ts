"use client";

import { useState, type DragEvent } from "react";

import { cn } from "@/lib/cn";

/**
 * HTML5 drag-and-drop of the rows of an ordered table (Kategoriyalar,
 * Bannerlar; gaps ADM-5.2 / ADM-6.4), the same pattern as the product
 * images. Dragging is a pointer convenience only: the up/down buttons
 * (`ReorderButtons`) stay the keyboard and single-pointer alternative
 * (WCAG 2.1.1, 2.5.7), and both end in the list's `move`.
 */
export function useRowDrag(move: (from: number, to: number) => boolean | void) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);

  const end = () => {
    setDragIndex(null);
    setOverIndex(null);
  };

  const rowProps = (index: number) => ({
    draggable: true,
    onDragStart: (event: DragEvent) => {
      setDragIndex(index);
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", String(index));
    },
    onDragOver: (event: DragEvent) => {
      if (dragIndex === null) return;
      event.preventDefault();
      event.dataTransfer.dropEffect = "move";
      setOverIndex(index);
    },
    onDragLeave: () => setOverIndex((current) => (current === index ? null : current)),
    onDrop: (event: DragEvent) => {
      event.preventDefault();
      if (dragIndex !== null) move(dragIndex, index);
      end();
    },
    onDragEnd: end,
    className: cn(
      "cursor-grab transition-opacity duration-150 active:cursor-grabbing",
      dragIndex === index && "opacity-50",
      overIndex === index &&
        dragIndex !== null &&
        dragIndex !== index &&
        "outline-2 -outline-offset-2 outline-gold-ink outline-dashed",
    ),
  });

  return { rowProps };
}
