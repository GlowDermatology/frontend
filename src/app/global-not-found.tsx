import "./globals.css";

import type { Metadata, Viewport } from "next";

import { NotFoundView } from "@/components/brand/not-found-view";
import { fontVariables } from "@/lib/fonts";
import { THEME_SCRIPT, THEME_VIEWPORT } from "@/lib/theme/theme-cookie";
import { ThemeSync } from "@/lib/theme/theme-sync";

export const metadata: Metadata = {
  title: "Sahifa topilmadi — Glow Derma",
};

export const viewport: Viewport = THEME_VIEWPORT;

/** 404 for URLs that match no route (rendered outside every root layout). */
export default function GlobalNotFound() {
  return (
    <html lang="uz" data-theme="light" className={fontVariables} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body>
        <ThemeSync />
        <NotFoundView />
      </body>
    </html>
  );
}
