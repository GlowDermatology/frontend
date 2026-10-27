"use client";

import { ShopErrorPage } from "@/features/shop/components/shop-error";

/** Branded "try again" for the Uzbek home page (the shop pages have their own boundary). */
export default function UzError({ reset }: { error: Error; reset: () => void }) {
  return <ShopErrorPage locale="uz" reset={reset} />;
}
