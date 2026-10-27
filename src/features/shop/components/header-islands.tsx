"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState, useSyncExternalStore } from "react";

import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/cn";
import type { Locale } from "@/lib/i18n/locales";

import { shopPath } from "../routing/routes";
import { hasSignedInHint } from "../shared/action-client";

/**
 * The header's only client code: the account link (reads the readable
 * signed-in hint, so the header stays static and cacheable), the cart link
 * with its count seam, and the small-screen menu.
 */

const subscribeNever = () => () => {};

/** `true` after hydration when the signed-in hint cookie is set; `false` on the server. */
function useSignedInHint(): boolean {
  return useSyncExternalStore(subscribeNever, hasSignedInHint, () => false);
}

const iconLink =
  "relative inline-flex size-11 items-center justify-center rounded-md text-ink transition-colors duration-150 hover:bg-gold-soft";

export function AccountLink({
  locale,
  labels,
}: {
  locale: Locale;
  labels: { account: string; signIn: string };
}) {
  const signedIn = useSignedInHint();
  // W3b: `account` becomes the profile page; until then both land on the
  // sign-in placeholder.
  const href = shopPath(locale, { kind: signedIn ? "account" : "signIn" });
  const label = signedIn ? labels.account : labels.signIn;
  return (
    <Link href={href} prefetch={false} aria-label={label} title={label} className={iconLink}>
      <Icon name="user" size={22} />
    </Link>
  );
}

/**
 * Cart count seam: W3b replaces this with the server cart's line count
 * (`GET cart/` through a Server Action or a small route), e.g. via a
 * context provider in the storefront layout. `null` = unknown, no badge.
 */
export function useCartCount(): number | null {
  return null;
}

export function CartLink({ locale, label }: { locale: Locale; label: string }) {
  const count = useCartCount();
  const name = count ? `${label} (${count})` : label;
  return (
    <Link
      href={shopPath(locale, { kind: "cart" })}
      prefetch={false}
      aria-label={name}
      title={label}
      className={iconLink}
    >
      <Icon name="bag" size={22} />
      {count ? (
        <span
          aria-hidden="true"
          className="absolute top-1 right-1 min-w-[18px] rounded-full bg-gold px-1 text-center text-[11px] leading-[18px] font-extrabold text-on-gold tabular-nums"
        >
          {count}
        </span>
      ) : null}
    </Link>
  );
}

interface MenuProps {
  links: ReadonlyArray<{ href: string; label: string }>;
  openLabel: string;
  closeLabel: string;
}

/** Disclosure menu below the `nav` breakpoint, where the inline links do not fit. */
export function ShopMenu({ links, openLabel, closeLabel }: MenuProps) {
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
    <div ref={rootRef} className="nav:hidden">
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
        <ul className="m-0 mx-auto flex max-w-page list-none flex-col px-[clamp(16px,4vw,48px)] py-2">
          {links.map((link) => (
            <li key={link.href} className="border-b border-line last:border-b-0">
              <a
                href={link.href}
                onClick={() => setOpen(false)}
                className="flex min-h-12 items-center justify-between text-[16px] font-semibold text-ink no-underline hover:text-gold-ink"
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
