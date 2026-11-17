import Link from "next/link";

import { cn } from "@/lib/cn";
import type { Locale } from "@/lib/i18n/locales";

import type { ShopDictionary } from "../content";
import { shopPath } from "../routing/routes";
import { AccountLink, CartLink, HeaderSearch, InboxLink, ShopMenu } from "./header-islands";
import { LanguageLinks } from "./language-switcher";
import { gutter, textLink } from "./layout-primitives";

/**
 * Storefront header: static (prerendered into every page's shell), with
 * small client islands for the product search (a field; an icon on phones),
 * the account menu (sign-in / sign-up or the private sections, and the
 * language list with flags), the cart and inbox links and the small-screen
 * menu (links and the same language list).
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
          <HeaderSearch
            action={shopPath(locale, { kind: "catalog" })}
            label={dict.header.searchLabel}
            placeholder={dict.header.searchPlaceholder}
            submitLabel={dict.header.search}
            openLabel={dict.header.searchOpen}
            closeLabel={dict.header.searchClose}
          />
          <InboxLink locale={locale} />
          <AccountLink locale={locale} />
          <CartLink locale={locale} label={dict.header.cart} />
          <ShopMenu
            links={links}
            openLabel={dict.header.menuOpen}
            closeLabel={dict.header.menuClose}
            language={<LanguageLinks current={locale} label={dict.header.languageLabel} />}
          />
        </div>
      </div>
    </header>
  );
}
