import "../globals.css";

import type { Metadata, Viewport } from "next";

import { fontVariables } from "@/lib/fonts";
import { THEME_SCRIPT, CUSTOMER_VIEWPORT } from "@/lib/theme/theme-cookie";
import { ThemeSync } from "@/lib/theme/theme-sync";

export const metadata: Metadata = {
  title: "Glow Derma",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = CUSTOMER_VIEWPORT;

/**
 * Root layout of `/pay/*`: the payment return page of the mobile app. It sits
 * outside the localized storefront groups so the backend's fixed
 * `PAYMENT_RETURN_URL` (`/pay/return`) is never redirected. The theme follows the site's
 * (`THEME_SCRIPT` before the first paint, `ThemeSync` after hydration).
 */
export default function PayRootLayout({ children }: LayoutProps<"/pay">) {
  return (
    <html
      lang="uz"
      data-theme="light"
      data-customer-web=""
      className={fontVariables}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="bg-surface font-sans text-ink">
        <ThemeSync />
        {children}
      </body>
    </html>
  );
}
