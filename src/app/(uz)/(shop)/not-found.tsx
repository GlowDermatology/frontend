import type { Metadata } from "next";

import { ShopNotFound } from "@/features/shop/pages/errors";

export const metadata: Metadata = { title: { absolute: "Sahifa topilmadi | Glow Derma" } };

export default function UzShopNotFound() {
  return <ShopNotFound locale="uz" />;
}
