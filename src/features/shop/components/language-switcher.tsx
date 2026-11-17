"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { DropdownMenu } from "radix-ui";
import { Suspense } from "react";

import { LocaleFlag } from "@/components/brand/locale-flag";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/cn";
import { LOCALE_INFO, LOCALES, type Locale } from "@/lib/i18n/locales";

import { homeHrefs, languageHrefs } from "./language-href";

/**
 * The storefront's language choice (DESIGN §F): the site's languages with inline SVG flags
 * (`LocaleFlag`, from `LOCALE_INFO`), each a plain anchor to the same page in that language
 * (`equivalentPath`, keeping the catalog's filters) — every language is its own document
 * (`<html lang>`, root layout). Shown in the account menu, the small-screen menu and the footer.
 * The current address is read on the client (`usePathname` / `useSearchParams`, inside
 * `<Suspense>`); until then the links point at each language's home page.
 */

function useLanguageHrefs(): Record<Locale, string> {
  const pathname = usePathname();
  const search = useSearchParams().toString();
  return languageHrefs(pathname, search);
}

interface LanguageListProps {
  current: Locale;
  /** The list's accessible name (and the stack layout's visible heading). */
  label: string;
  /** `stack`: rows (the small-screen menu); `inline`: one quiet line (the footer). */
  layout?: "stack" | "inline";
  className?: string;
}

function LanguageList({
  current,
  label,
  layout = "stack",
  className,
  hrefs,
}: LanguageListProps & { hrefs: Record<Locale, string> }) {
  const stack = layout === "stack";
  return (
    <nav aria-label={label} className={className}>
      {stack ? (
        <p aria-hidden="true" className="m-0 mb-1.5 text-overline text-ink-muted uppercase">
          {label}
        </p>
      ) : null}
      <ul
        className={cn(
          "m-0 list-none p-0",
          stack
            ? "grid grid-cols-1 gap-1 min-[420px]:grid-cols-3"
            : "flex flex-wrap gap-x-5 gap-y-2",
        )}
      >
        {LOCALES.map((locale) => {
          const active = locale === current;
          return (
            <li key={locale}>
              <a
                href={hrefs[locale]}
                hrefLang={locale}
                lang={locale}
                aria-current={active ? "true" : undefined}
                className={cn(
                  "flex items-center gap-2.5 no-underline transition-colors duration-150",
                  stack
                    ? cn(
                        "min-h-12 rounded-md border px-3 text-[15px] font-semibold",
                        active
                          ? "border-gold/60 bg-gold-soft text-ink"
                          : "border-line text-ink hover:border-gold/50 hover:bg-gold-soft/60",
                      )
                    : cn(
                        "min-h-6 text-body-sm",
                        active ? "font-bold text-ink" : "text-ink-muted hover:text-ink",
                      ),
                )}
              >
                <LocaleFlag locale={locale} className={stack ? undefined : "h-3 w-[18px]"} />
                <span className="flex-1">{LOCALE_INFO[locale].name}</span>
                {stack && active ? (
                  <Icon name="check" size={18} className="shrink-0 text-gold-ink" />
                ) : null}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function LiveLanguageList(props: LanguageListProps) {
  return <LanguageList {...props} hrefs={useLanguageHrefs()} />;
}

/** The language links of the small-screen menu and the footer (plain anchors, no JS needed). */
export function LanguageLinks(props: LanguageListProps) {
  return (
    <Suspense fallback={<LanguageList {...props} hrefs={homeHrefs()} />}>
      <LiveLanguageList {...props} />
    </Suspense>
  );
}

const menuItemClass =
  "flex h-10 cursor-pointer items-center gap-2.5 rounded-sm px-3 text-label text-ink no-underline outline-none select-none data-[highlighted]:bg-gold-soft";

function MenuItems({ current, hrefs }: { current: Locale; hrefs: Record<Locale, string> }) {
  return LOCALES.map((locale) => {
    const active = locale === current;
    return (
      <DropdownMenu.Item key={locale} asChild className={menuItemClass}>
        <a
          href={hrefs[locale]}
          hrefLang={locale}
          lang={locale}
          aria-current={active ? "true" : undefined}
        >
          <LocaleFlag locale={locale} />
          <span className="flex-1">{LOCALE_INFO[locale].name}</span>
          {active ? <Icon name="check" size={16} className="shrink-0 text-gold-ink" /> : null}
        </a>
      </DropdownMenu.Item>
    );
  });
}

function LiveMenuItems({ current }: { current: Locale }) {
  return <MenuItems current={current} hrefs={useLanguageHrefs()} />;
}

/** The account menu's language section: a labelled group of menu items (flag, name, check). */
export function LanguageMenuGroup({ current, label }: { current: Locale; label: string }) {
  return (
    <DropdownMenu.Group aria-label={label}>
      <DropdownMenu.Label
        aria-hidden="true"
        className="px-3 pt-2 pb-1 text-overline text-ink-muted uppercase"
      >
        {label}
      </DropdownMenu.Label>
      <Suspense fallback={<MenuItems current={current} hrefs={homeHrefs()} />}>
        <LiveMenuItems current={current} />
      </Suspense>
    </DropdownMenu.Group>
  );
}
