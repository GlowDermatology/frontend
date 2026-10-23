import { cn } from "@/lib/cn";

import { LOCALE_INFO, LOCALES, localePath, type Locale } from "../i18n";

interface LanguageSwitcherProps {
  current: Locale;
  label: string;
}

/**
 * UZ / RU / EN pill. Plain anchors on purpose: each language is a separate,
 * statically generated document (different root layout and `<html lang>`).
 */
export function LanguageSwitcher({ current, label }: LanguageSwitcherProps) {
  return (
    <nav aria-label={label}>
      <ul className="m-0 flex list-none gap-0.5 rounded-full border border-line p-1">
        {LOCALES.map((locale) => {
          const active = locale === current;
          return (
            <li key={locale}>
              <a
                href={localePath(locale)}
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
