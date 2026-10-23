import type { Metadata } from "next";

import { NotFoundView } from "@/components/brand/not-found-view";

export const metadata: Metadata = {
  title: "Sahifa topilmadi — Glow Derma",
};

export default function LocaleNotFound() {
  return <NotFoundView />;
}
