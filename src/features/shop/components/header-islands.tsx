"use client";

import Link from "next/link";
import { DropdownMenu } from "radix-ui";
import { useEffect, useId, useRef, useState } from "react";

import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/cn";
import type { Locale } from "@/lib/i18n/locales";

import type { AccountSection } from "../account/account-shell";
import { useShopSession } from "../account/session-context";
import { commonCopy } from "../copy/common";
import { shopPath } from "../routing/routes";
import { readShopCsrf } from "../shared/action-client";

/**
 * The header's client code: the account menu (reads the readable signed-in
 * hint, so the header stays static and cacheable), the cart and inbox links
 * with their badges (`ShopSessionProvider`) and the small-screen menu.
 */

const iconLink =
  "relative inline-flex size-11 items-center justify-center rounded-md text-ink transition-colors duration-150 hover:bg-gold-soft data-[state=open]:bg-gold-soft";

const badgeClass =
  "absolute top-1 right-1 min-w-[18px] rounded-full bg-gold px-1 text-center text-[11px] leading-[18px] font-extrabold text-on-gold tabular-nums";

/**
 * The account entry: «Kirish» for visitors; for a signed-in customer (the
 * readable hint cookie) a menu with the name, the private sections and
 * «Chiqish» (a same-origin POST to the logout route with the csrf token,
 * which clears the session cookies and returns to the home page).
 */
export function AccountLink({ locale }: { locale: Locale }) {
  const { summary, signedInHint } = useShopSession();
  const copy = commonCopy[locale];
  const formRef = useRef<HTMLFormElement>(null);
  const csrfRef = useRef<HTMLInputElement>(null);
  const signedIn = signedInHint && summary?.signedIn !== false;

  if (!signedIn) {
    const label = copy.header.signIn;
    return (
      <Link
        href={shopPath(locale, { kind: "signIn" })}
        prefetch={false}
        aria-label={label}
        title={label}
        className={iconLink}
      >
        <Icon name="user" size={22} />
      </Link>
    );
  }

  const items: ReadonlyArray<{ kind: AccountSection; label: string }> = [
    { kind: "orders", label: copy.nav.orders },
    { kind: "appointments", label: copy.nav.appointments },
    { kind: "cashback", label: copy.nav.cashback },
    { kind: "account", label: copy.nav.account },
    { kind: "sessions", label: copy.nav.sessions },
  ];
  const itemClass =
    "flex h-10 cursor-pointer items-center gap-2.5 rounded-sm px-3 text-label text-ink no-underline outline-none select-none data-[highlighted]:bg-gold-soft";

  return (
    <>
      <DropdownMenu.Root modal={false}>
        <DropdownMenu.Trigger
          aria-label={copy.header.menuLabel}
          title={copy.header.signedIn}
          className={iconLink}
        >
          <Icon name="user" size={22} />
          <span
            aria-hidden="true"
            className="absolute right-2.5 bottom-2.5 size-2 rounded-full bg-gold ring-2 ring-surface"
          />
        </DropdownMenu.Trigger>
        <DropdownMenu.Content
          align="end"
          sideOffset={8}
          collisionPadding={12}
          className="z-50 min-w-[240px] rounded-md border border-line bg-surface-raised p-1.5 text-ink shadow-lg data-[state=closed]:animate-pop-out data-[state=open]:animate-pop-in"
        >
          <DropdownMenu.Label className="px-3 pt-2 pb-2.5">
            <span className="block text-overline text-ink-muted uppercase">
              {copy.header.signedIn}
            </span>
            <span className="mt-1 block truncate font-serif text-[22px] leading-7 font-semibold">
              {summary?.name ? copy.header.greeting(summary.name) : copy.eyebrow}
            </span>
          </DropdownMenu.Label>
          <DropdownMenu.Separator className="mx-1 my-1 h-px bg-line" />
          {items.map((item) => (
            <DropdownMenu.Item key={item.kind} asChild className={itemClass}>
              <Link href={shopPath(locale, { kind: item.kind })}>{item.label}</Link>
            </DropdownMenu.Item>
          ))}
          <DropdownMenu.Separator className="mx-1 my-1 h-px bg-line" />
          <DropdownMenu.Item
            className={itemClass}
            onSelect={() => {
              if (csrfRef.current) csrfRef.current.value = readShopCsrf();
              formRef.current?.requestSubmit();
            }}
          >
            <Icon name="logout" size={18} className="text-ink-muted" />
            {copy.header.signOut}
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Root>
      <form ref={formRef} method="post" action="/api/shop/auth/logout" hidden>
        <input ref={csrfRef} type="hidden" name="csrf" defaultValue="" />
        <input type="hidden" name="next" value={shopPath(locale, { kind: "home" })} />
      </form>
    </>
  );
}

/** The header's cart quantity (signed-in customers); `null` = unknown, no badge. */
export function useCartCount(): number | null {
  const { summary } = useShopSession();
  return summary?.signedIn ? summary.cartQuantity : null;
}

export function CartLink({ locale, label }: { locale: Locale; label: string }) {
  const count = useCartCount();
  const name = count ? commonCopy[locale].header.cartWith(count) : label;
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
        <span aria-hidden="true" className={badgeClass}>
          {count > 99 ? "99+" : count}
        </span>
      ) : null}
    </Link>
  );
}

/** The inbox bell with its unread badge, for signed-in customers only. */
export function InboxLink({ locale }: { locale: Locale }) {
  const { summary } = useShopSession();
  if (!summary?.signedIn) return null;
  const copy = commonCopy[locale].header;
  const unread = summary.unread;
  const name = unread > 0 ? copy.inboxUnread(unread) : copy.inbox;
  return (
    <Link
      href={shopPath(locale, { kind: "inbox" })}
      prefetch={false}
      aria-label={name}
      title={copy.inbox}
      className={iconLink}
    >
      <Icon name="bell" size={22} />
      {unread > 0 ? (
        <span aria-hidden="true" className={badgeClass}>
          {unread > 99 ? "99+" : unread}
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
