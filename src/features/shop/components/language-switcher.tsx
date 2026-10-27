"use client";

import { usePathname, useSearchParams } from "next/navigation";

import { cn } from "@/lib/cn";
import { LOCALE_INFO, LOCALES, type Locale } from "@/lib/i18n/locales";

import { equivalentPath, shopPath } from "../routing/routes";

interface LanguageSwitcherProps {
  current: Locale;
  label: string;
}

/** The query a language switch keeps: the catalog's filters, nothing else. */
const KEPT_PARAMS = ["q", "category", "sort", "stock", "page"];

function Pills({
  current,
  label,
  href,
}: LanguageSwitcherProps & { href: (locale: Locale) => string }) {
  return (
    <nav aria-label={label}>
      <ul className="m-0 flex list-none gap-0.5 rounded-full border border-line p-1">
        {LOCALES.map((locale) => {
          const active = locale === current;
          return (
            <li key={locale}>
              <a
                href={href(locale)}
                hrefLang={locale}
                lang={locale}
                aria-current={active ? "true" : undefined}
                className={cn(
                  "flex h-9 min-w-11 items-center justify-center rounded-full px-2.5 text-[12px] leading-none font-bold tracking-[0.04em] no-underline transition-colors duration-150",
                  active
                    ? "bg-ink text-surface"
                    : "text-ink-muted hover:bg-gold-soft hover:text-ink",
                )}
              >
                <span aria-hidden="true">{LOCALE_INFO[locale].short}</span>
                <span className="sr-only">{LOCALE_INFO[locale].name}</span>
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/**
 * UZ / RU / EN pill that keeps the visitor on the same page: `/mahsulotlar/x`
 * ↔ `/ru/products/x`, with the catalog's filters. Plain anchors: each
 * language is its own document (`<html lang>`, root layout).
 */
export function LanguageSwitcher({ current, label }: LanguageSwitcherProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const kept = new URLSearchParams();
  for (const key of KEPT_PARAMS) {
    const value = searchParams.get(key);
    if (value) kept.set(key, value);
  }
  const query = kept.toString();
  return (
    <Pills
      current={current}
      label={label}
      href={(locale) => `${equivalentPath(pathname, locale)}${query ? `?${query}` : ""}`}
    />
  );
}

/** Before the URL is known (static shell): each language's home page. */
export function LanguageSwitcherFallback({ current, label }: LanguageSwitcherProps) {
  return (
    <Pills current={current} label={label} href={(locale) => shopPath(locale, { kind: "home" })} />
  );
}
