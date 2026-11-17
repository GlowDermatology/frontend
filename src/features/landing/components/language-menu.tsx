"use client";

import { DropdownMenu } from "radix-ui";

import { LocaleFlag } from "@/components/brand/locale-flag";
import { Icon } from "@/components/ui/icon";

import { LOCALE_INFO, LOCALES, localePath, type Locale } from "../i18n";

/**
 * The landing header's language choice (DESIGN §F, the storefront's treatment): one compact
 * button with the current flag that opens a menu of the languages with flags; each item is a
 * plain anchor to that language's page. The footer repeats the links without JavaScript.
 */
export function LanguageMenu({ current, label }: { current: Locale; label: string }) {
  const name = `${label}: ${LOCALE_INFO[current].name}`;
  return (
    <DropdownMenu.Root modal={false}>
      <DropdownMenu.Trigger
        aria-label={name}
        title={name}
        className="flex h-11 items-center gap-2 rounded-full border border-line px-3 text-[12px] leading-none font-bold tracking-[0.04em] text-ink transition-colors duration-150 hover:bg-gold-soft data-[state=open]:bg-gold-soft"
      >
        <LocaleFlag locale={current} className="h-3.5 w-[21px]" />
        <span aria-hidden="true">{LOCALE_INFO[current].short}</span>
        <Icon name="chevron-down" size={16} className="text-ink-muted" />
      </DropdownMenu.Trigger>
      <DropdownMenu.Content
        align="end"
        sideOffset={8}
        collisionPadding={12}
        className="z-50 min-w-[208px] rounded-md border border-line bg-surface-raised p-1.5 text-ink shadow-lg data-[state=closed]:animate-pop-out data-[state=open]:animate-pop-in"
      >
        <DropdownMenu.Group aria-label={label}>
          <DropdownMenu.Label
            aria-hidden="true"
            className="px-3 pt-2 pb-1 text-overline text-ink-muted uppercase"
          >
            {label}
          </DropdownMenu.Label>
          {LOCALES.map((locale) => {
            const active = locale === current;
            return (
              <DropdownMenu.Item
                key={locale}
                asChild
                className="flex h-10 cursor-pointer items-center gap-2.5 rounded-sm px-3 text-label text-ink no-underline outline-none select-none data-[highlighted]:bg-gold-soft"
              >
                <a
                  href={localePath(locale)}
                  hrefLang={locale}
                  lang={locale}
                  aria-current={active ? "true" : undefined}
                >
                  <LocaleFlag locale={locale} />
                  <span className="flex-1">{LOCALE_INFO[locale].name}</span>
                  {active ? (
                    <Icon name="check" size={16} className="shrink-0 text-gold-ink" />
                  ) : null}
                </a>
              </DropdownMenu.Item>
            );
          })}
        </DropdownMenu.Group>
      </DropdownMenu.Content>
    </DropdownMenu.Root>
  );
}
