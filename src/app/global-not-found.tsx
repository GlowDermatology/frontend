import "./globals.css";

import type { Metadata } from "next";

import { NotFoundView } from "@/components/brand/not-found-view";
import { fontVariables } from "@/lib/fonts";

export const metadata: Metadata = {
  title: "Sahifa topilmadi — Glow Derma",
};

/** 404 for URLs that match no route (rendered outside every root layout). */
export default function GlobalNotFound() {
  return (
    <html lang="uz" data-theme="light" className={fontVariables}>
      <body>
        <NotFoundView />
      </body>
    </html>
  );
}
