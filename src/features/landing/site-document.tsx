import type { ReactNode } from "react";

import { fontVariables } from "@/lib/fonts";

import type { Locale } from "./i18n";

/** `<html>`/`<body>` shell shared by the landing page's root layouts. */
export function SiteDocument({ locale, children }: { locale: Locale; children: ReactNode }) {
  return (
    <html lang={locale} data-theme="light" data-scroll-behavior="smooth" className={fontVariables}>
      <body>{children}</body>
    </html>
  );
}
