import "../globals.css";

import type { Metadata, Viewport } from "next";

import { fontVariables } from "@/lib/fonts";

export const metadata: Metadata = {
  title: "Glow Derma",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#fbf8f2",
  colorScheme: "light",
};

/**
 * Root layout of `/pay/*`: the payment return page of the mobile app. It sits
 * outside the localized storefront groups so the backend's fixed
 * `PAYMENT_RETURN_URL` (`/pay/return`) is never redirected.
 */
export default function PayRootLayout({ children }: LayoutProps<"/pay">) {
  return (
    <html lang="uz" data-theme="light" className={fontVariables}>
      <body className="bg-surface font-sans text-ink">{children}</body>
    </html>
  );
}
