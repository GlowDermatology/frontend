import "../globals.css";

import type { Metadata, Viewport } from "next";

import { HTML_LANG_SCRIPT } from "@/lib/i18n/admin-locale-cookie";
import { fontVariables } from "@/lib/fonts";
import { THEME_SCRIPT, THEME_VIEWPORT } from "@/lib/theme/theme-cookie";
import { ThemeSync } from "@/lib/theme/theme-sync";

export const metadata: Metadata = {
  title: { template: "%s — Glow Derma Admin", default: "Glow Derma Admin" },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = THEME_VIEWPORT;

/**
 * Root layout of the private admin panel (desktop + tablet).
 *
 * It stays static: the staff session is verified inside each page's data boundary (and in every
 * Server Action), and the admin language (`gd_admin_language`) is read by the panel layout
 * (`(panel)/layout.tsx`, inside `<Suspense>`). `<html lang>` defaults to Uzbek and the inline head
 * script sets it from the cookie while the HTML is parsed ("Preventing flash before hydration",
 * cookie variant), hence `suppressHydrationWarning`; the theme script does the same for
 * `<html data-theme>` (`gd_theme`, else the device's setting) and `ThemeSync` keeps it current. The toast and tooltip providers live in the
 * panel's `LocalizedShell`, inside the locale.
 */
export default function AdminRootLayout({ children }: LayoutProps<"/admin">) {
  return (
    <html lang="uz" data-theme="light" className={fontVariables} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: HTML_LANG_SCRIPT }} />
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body>
        <ThemeSync />
        {children}
      </body>
    </html>
  );
}
