import Link from "next/link";
import { Suspense } from "react";

import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/cn";
import type { Locale } from "@/lib/i18n/locales";

import type { ShopDictionary } from "../content";
import { shopPath } from "../routing/routes";
import { AccountLink, CartLink, InboxLink, ShopMenu } from "./header-islands";
import { LanguageSwitcher, LanguageSwitcherFallback } from "./language-switcher";
import { gutter, textLink } from "./layout-primitives";

/**
 * Storefront header: static (prerendered into every page's shell), with
 * small client islands for the language switch, the account and cart links
 * and the small-screen menu.
 */
export function ShopHeader({ locale, dict }: { locale: Locale; dict: ShopDictionary }) {
  const links = [
    { href: shopPath(locale, { kind: "catalog" }), label: dict.header.catalog },
    { href: shopPath(locale, { kind: "specialists" }), label: dict.header.specialists },
    { href: shopPath(locale, { kind: "services" }), label: dict.header.services },
  ];
  return (
    <header className="relative z-20 border-b border-line bg-surface">
      <div
        className={cn("mx-auto flex max-w-page items-center justify-between gap-4 py-3.5", gutter)}
      >
        <Link
          href={shopPath(locale, { kind: "home" })}
          aria-label={dict.header.home}
          className={cn(
            "font-serif text-[clamp(24px,3vw,30px)] leading-9 font-semibold tracking-[-0.01em] whitespace-nowrap text-ink",
            textLink,
          )}
        >
          Glow Derma
        </Link>

        <nav aria-label={dict.header.navLabel} className="hidden nav:block">
          <ul className="m-0 flex list-none items-center gap-9 p-0 text-[15px] font-semibold">
            {links.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className={cn("whitespace-nowrap text-ink", textLink)}>
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex items-center gap-1 sm:gap-2">
          <div className="hidden sm:block">
            <Suspense
              fallback={
                <LanguageSwitcherFallback current={locale} label={dict.header.languageLabel} />
              }
            >
              <LanguageSwitcher current={locale} label={dict.header.languageLabel} />
            </Suspense>
          </div>
          <Link
            href={shopPath(locale, { kind: "catalog" })}
            aria-label={dict.header.search}
            title={dict.header.search}
            className="inline-flex size-11 items-center justify-center rounded-md text-ink transition-colors duration-150 hover:bg-gold-soft"
          >
            <Icon name="search" size={22} />
          </Link>
          <InboxLink locale={locale} />
          <AccountLink locale={locale} />
          <CartLink locale={locale} label={dict.header.cart} />
          <ShopMenu
            links={links}
            openLabel={dict.header.menuOpen}
            closeLabel={dict.header.menuClose}
          />
        </div>
      </div>
      {/* Phones: the language pill gets its own row under the header. */}
      <div className={cn("flex justify-end border-t border-line py-2 sm:hidden", gutter)}>
        <Suspense
          fallback={<LanguageSwitcherFallback current={locale} label={dict.header.languageLabel} />}
        >
          <LanguageSwitcher current={locale} label={dict.header.languageLabel} />
        </Suspense>
      </div>
    </header>
  );
}
