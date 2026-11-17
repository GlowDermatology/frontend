"use client";

import { useTransition } from "react";

import { LocaleFlag } from "@/components/brand/locale-flag";
import { chooseSignInLanguage } from "@/data/admin-language.actions";
import { useAdminLocale, useCopy } from "@/lib/i18n/admin-context";
import { cn } from "@/lib/cn";
import { LOCALE_INFO, LOCALES } from "@/lib/i18n/locales";

import { staffAuthCopy } from "./copy";

/**
 * The staff sign-in pages' small language switch (DESIGN §G): «UZ RU EN» with flags, a group of
 * toggle buttons. A choice sets this browser's `gd_admin_language` cookie (`chooseSignInLanguage`,
 * no session needed) and refreshes the route, so the page re-renders in that language; the
 * account's saved language replaces it at sign-in. Typed values in the form survive the refresh.
 */
export function SignInLanguageSwitch({ className }: { className?: string }) {
  const current = useAdminLocale();
  const t = useCopy(staffAuthCopy).language;
  const [pending, startTransition] = useTransition();

  return (
    <div
      role="group"
      aria-label={t.label}
      aria-busy={pending || undefined}
      className={cn(
        "inline-flex items-center gap-0.5 rounded-full border border-line bg-surface p-0.5",
        pending && "opacity-70",
        className,
      )}
    >
      {LOCALES.map((locale) => {
        const active = locale === current;
        return (
          <button
            key={locale}
            type="button"
            lang={locale}
            aria-pressed={active}
            onClick={() => {
              if (active || pending) return;
              startTransition(async () => {
                await chooseSignInLanguage(locale);
              });
            }}
            className={cn(
              "flex h-8 items-center gap-1.5 rounded-full px-2.5 text-[12px] leading-none font-bold tracking-[0.04em] transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-gold-ink",
              active ? "bg-ink text-surface" : "text-ink-muted hover:bg-gold-soft hover:text-ink",
              pending && !active && "cursor-wait",
            )}
          >
            <LocaleFlag locale={locale} className="h-3 w-[18px] rounded-[2px]" />
            <span aria-hidden="true">{LOCALE_INFO[locale].short}</span>
            <span className="sr-only">{LOCALE_INFO[locale].name}</span>
          </button>
        );
      })}
      <span role="status" className="sr-only">
        {pending ? t.changing : null}
      </span>
    </div>
  );
}
