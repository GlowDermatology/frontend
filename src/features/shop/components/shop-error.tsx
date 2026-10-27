"use client";

import { useEffect, useRef } from "react";

import { Button } from "@/components/ui/button";
import type { Locale } from "@/lib/i18n/locales";

import { errorCopy } from "../content/errors";

/**
 * The storefront's error boundary body: a calm "try again" inside the
 * header and footer; focus moves to the heading so screen readers hear it.
 */
export function ShopError({ locale, reset }: { locale: Locale; reset: () => void }) {
  const t = errorCopy[locale];
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => heading.current?.focus(), []);
  return (
    <div className="mx-auto flex max-w-[560px] flex-col items-center gap-5 px-6 py-[clamp(64px,10vw,140px)] text-center">
      <title>{`${t.errorTitle} | Glow Derma`}</title>
      <meta name="robots" content="noindex" />
      <h1
        ref={heading}
        tabIndex={-1}
        className="m-0 font-serif text-headline-sm font-semibold text-ink focus:outline-none"
      >
        {t.errorTitle}
      </h1>
      <p className="m-0 text-body text-ink-muted">{t.errorBody}</p>
      <Button size="lg" onClick={reset}>
        {t.retry}
      </Button>
    </div>
  );
}

/**
 * The same message as a whole page (no shop header around it): the home
 * pages' boundary, where the failing part may be the page's own frame.
 */
export function ShopErrorPage({ locale, reset }: { locale: Locale; reset: () => void }) {
  return (
    <div className="flex min-h-dvh flex-col bg-surface text-ink">
      <header className="border-b border-line">
        <div className="mx-auto flex max-w-page items-center px-[clamp(16px,4vw,48px)] py-4">
          <a
            href={locale === "uz" ? "/" : `/${locale}`}
            className="font-serif text-[clamp(24px,3vw,30px)] leading-9 font-semibold text-ink no-underline"
          >
            Glow Derma
          </a>
        </div>
      </header>
      <main className="flex-1">
        <ShopError locale={locale} reset={reset} />
      </main>
    </div>
  );
}
