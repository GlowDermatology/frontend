"use client";

import { ShopError } from "@/features/shop/components/shop-error";

export default function UzShopError({ reset }: { error: Error; reset: () => void }) {
  return <ShopError locale="uz" reset={reset} />;
}
