import "../globals.css";

import type { Metadata, Viewport } from "next";

import { ToastProvider } from "@/components/ui/toast";
import { fontVariables } from "@/lib/fonts";

export const metadata: Metadata = {
  title: { template: "%s — Glow Derma Admin", default: "Glow Derma Admin" },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#fbf8f2",
  colorScheme: "light",
};

/**
 * Root layout of the private admin panel (desktop + tablet).
 *
 * Authentication is out of scope for this phase. When the Django API is
 * connected, verify the staff session inside each page's data boundary (and
 * in every Server Action), not here: reading cookies in a layout would make
 * every admin route block on the request.
 */
export default function AdminRootLayout({ children }: LayoutProps<"/admin">) {
  return (
    <html lang="uz" data-theme="light" className={fontVariables}>
      <body>
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
