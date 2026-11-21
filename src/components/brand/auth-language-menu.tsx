"use client";

import { DropdownMenu } from "radix-ui";
import { useTransition } from "react";

import { Icon } from "@/components/ui/icon";
import { menuCheckItemClass, menuContentClass } from "@/components/ui/menu";
import { LOCALE_INFO, LOCALES, type Locale } from "@/lib/i18n/locales";

import { LocaleFlag } from "./locale-flag";

type LanguageChoice =
  | { hrefs: Record<Locale, string>; choose?: never }
  | { hrefs?: never; choose: (locale: Locale) => Promise<unknown> };

export function AuthLanguageMenu({
  current,
  label,
  hrefs,
  choose,
}: LanguageChoice & { current: Locale; label: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <DropdownMenu.Root modal={false}>
      <DropdownMenu.Trigger
        aria-label={label}
        title={LOCALE_INFO[current].name}
        aria-busy={pending || undefined}
        disabled={pending}
        className="flex h-[38px] shrink-0 items-center gap-1.5 rounded-full border border-line bg-surface px-2.5 text-label text-ink hover:bg-gold-soft focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-gold-ink"
      >
        <LocaleFlag locale={current} className="h-3 w-[18px]" />
        {LOCALE_INFO[current].short}
        <Icon name="chevron-down" size={14} />
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          aria-label={label}
          align="end"
          sideOffset={8}
          className={menuContentClass}
        >
          {LOCALES.map((locale) => {
            const active = locale === current;
            const content = (
              <>
                <LocaleFlag locale={locale} />
                <span lang={locale}>{LOCALE_INFO[locale].name}</span>
                {active ? (
                  <Icon name="check" size={16} className="absolute right-3 text-gold-ink" />
                ) : null}
              </>
            );
            return hrefs && !active ? (
              <DropdownMenu.Item key={locale} asChild className={menuCheckItemClass}>
                <a href={hrefs[locale]} hrefLang={locale}>
                  {content}
                </a>
              </DropdownMenu.Item>
            ) : (
              <DropdownMenu.Item
                key={locale}
                className={menuCheckItemClass}
                aria-current={active ? "true" : undefined}
                onSelect={() => {
                  if (!active && choose)
                    startTransition(async () => {
                      await choose(locale);
                    });
                }}
              >
                {content}
              </DropdownMenu.Item>
            );
          })}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
