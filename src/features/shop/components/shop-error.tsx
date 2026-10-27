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
