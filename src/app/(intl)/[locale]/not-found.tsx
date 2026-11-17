import type { Metadata } from "next";

import { LocaleNotFoundView } from "@/components/brand/locale-not-found";

export const metadata: Metadata = {
  title: "Sahifa topilmadi — Glow Derma",
};

export default function LocaleNotFound() {
  return <LocaleNotFoundView />;
}
