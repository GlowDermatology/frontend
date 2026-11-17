import type { Metadata } from "next";

import { ShopChrome } from "@/features/shop/components/shop-chrome";
import { ShopNotFound } from "@/features/shop/pages/errors";

export const metadata: Metadata = { title: { absolute: "Sahifa topilmadi | Glow Derma" } };

/**
 * `/kirish` while the storefront is not served (mock mode: the page calls `notFound()`): the
 * storefront 404 in its chrome, as on the other shop pages (`(shop)/not-found.tsx`).
 */
export default function UzAuthNotFound() {
  return (
    <ShopChrome locale="uz">
      <ShopNotFound locale="uz" />
    </ShopChrome>
  );
}
