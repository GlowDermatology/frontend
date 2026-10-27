import type { ReactNode } from "react";

import type { Locale } from "@/lib/i18n/locales";

import { ShopSessionProvider } from "../account/session-context";
import { getShopDictionary } from "../content";
import { ShopFooter } from "./shop-footer";
import { ShopHeader } from "./shop-header";

export const MAIN_ID = "main";

/**
 * Skip link, header, `<main>` and footer around every storefront page, inside
 * the client provider of the header's signed-in summary (name and badges).
 */
export function ShopChrome({ locale, children }: { locale: Locale; children: ReactNode }) {
  const dict = getShopDictionary(locale);
  return (
    <ShopSessionProvider locale={locale}>
      <div className="flex min-h-dvh flex-col bg-surface text-ink">
        <a
          href={`#${MAIN_ID}`}
          className="sr-only z-50 rounded-md bg-ink px-4 py-3 text-label text-surface focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
        >
          {dict.skipLink}
        </a>
        <ShopHeader locale={locale} dict={dict} />
        <main id={MAIN_ID} tabIndex={-1} className="flex-1 focus:outline-none">
          {children}
        </main>
        <ShopFooter locale={locale} dict={dict} />
      </div>
    </ShopSessionProvider>
  );
}
