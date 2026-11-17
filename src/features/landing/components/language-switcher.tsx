import { LocaleFlag } from "@/components/brand/locale-flag";
import { cn } from "@/lib/cn";

import { LOCALE_INFO, LOCALES, localePath, type Locale } from "../i18n";

interface LanguageLinksProps {
  current: Locale;
  label: string;
  className?: string;
}

/**
 * The landing's language links with flags, at the foot of the page: plain anchors (no JavaScript
 * needed), each language being a separate, statically generated document (`<html lang>`). The
 * header offers the same choice in a menu (`LanguageMenu`).
 */
export function LanguageLinks({ current, label, className }: LanguageLinksProps) {
  return (
    <nav aria-label={label} className={className}>
      <ul className="m-0 flex list-none flex-wrap gap-x-5 gap-y-2 p-0">
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
                  "flex min-h-6 items-center gap-2 text-body-sm no-underline transition-colors duration-150",
                  active ? "font-bold text-ink" : "text-ink-muted hover:text-ink",
                )}
              >
                <LocaleFlag locale={locale} className="h-3 w-[18px]" />
                {LOCALE_INFO[locale].name}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
