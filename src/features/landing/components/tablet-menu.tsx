"use client";

import { useEffect, useId, useRef, useState } from "react";

import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/cn";

interface TabletMenuProps {
  links: ReadonlyArray<{ href: string; label: string }>;
  openLabel: string;
  closeLabel: string;
}

/**
 * Disclosure menu for medium widths. The design hides the section links below
 * 960px and lets the header wrap above that; this keeps them reachable until
 * the full row fits (`nav` breakpoint). Phones keep the design's
 * logo + language row, where there is no room for another control.
 */
export function TabletMenu({ links, openLabel, closeLabel }: TabletMenuProps) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="hidden sm:block nav:hidden">
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={open ? closeLabel : openLabel}
        onClick={() => setOpen((value) => !value)}
        className="flex size-11 items-center justify-center rounded-md border border-line text-ink transition-colors duration-150 hover:bg-gold-soft"
      >
        <Icon name={open ? "close" : "menu"} size={20} />
      </button>
      <div
        id={panelId}
        hidden={!open}
        className={cn(
          "absolute inset-x-0 top-full z-30 border-b border-line bg-surface shadow-lg",
          open && "animate-pop-in",
        )}
      >
        <ul className="mx-auto m-0 flex max-w-[1280px] list-none flex-col px-[clamp(16px,4vw,48px)] py-2">
          {links.map((link) => (
            <li key={link.href} className="border-b border-line last:border-b-0">
              <a
                href={link.href}
                onClick={() => setOpen(false)}
                className="flex min-h-12 items-center justify-between text-[15px] font-semibold text-ink no-underline hover:text-gold-ink"
              >
                {link.label}
                <Icon name="arrow-right" size={18} className="text-gold-ink" />
              </a>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
