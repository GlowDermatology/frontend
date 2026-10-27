import type { Metadata } from "next";

import { ShopNotFound } from "@/features/shop/pages/errors";

export const metadata: Metadata = {
  title: "Sahifa topilmadi — Glow Derma",
  robots: { index: false, follow: false },
};

export default function UzShopNotFound() {
  return <ShopNotFound locale="uz" />;
}
