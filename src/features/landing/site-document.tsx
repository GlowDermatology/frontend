import type { ReactNode } from "react";

import { fontVariables } from "@/lib/fonts";
import { THEME_SCRIPT } from "@/lib/theme/theme-cookie";
import { ThemeSync } from "@/lib/theme/theme-sync";

import type { Locale } from "./i18n";

/**
 * `<html>`/`<body>` shell shared by the landing page's root layouts. The theme (`gd_theme`, else
 * the device's setting) is put on `<html data-theme>` by the inline head script before the first
 * paint, hence `suppressHydrationWarning`; `ThemeSync` keeps it current.
 */
export function SiteDocument({ locale, children }: { locale: Locale; children: ReactNode }) {
  return (
    <html
      lang={locale}
      data-theme="light"
      data-scroll-behavior="smooth"
      className={fontVariables}
      suppressHydrationWarning
    >
      {/* eslint-disable-next-line @next/next/no-head-element -- the App Router root layouts of
          the landing render this document; `next/head` is the Pages Router API. */}
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body>
        <ThemeSync />
        {children}
      </body>
    </html>
  );
}
