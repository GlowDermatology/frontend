"use client";

import "./globals.css";

import { ShopErrorPage } from "@/features/shop/components/shop-error";
import type { Locale } from "@/lib/i18n/locales";

/**
 * Last-resort boundary (a root layout failed): the storefront's branded,
 * localized "try again" instead of Next's English default. The language
 * comes from the path (`/ru/…`, `/en/…`, else Uzbek); `noindex`.
 */
function localeFromPath(): Locale {
  if (typeof window === "undefined") return "uz";
  const first = window.location.pathname.split("/")[1];
  return first === "ru" || first === "en" ? first : "uz";
}

export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  const locale = localeFromPath();
  return (
    <html lang={locale}>
      <body>
        <ShopErrorPage locale={locale} reset={reset} />
      </body>
    </html>
  );
}
