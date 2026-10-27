import type { Metadata } from "next";

import { CartPage, cartMetadata } from "@/features/shop/pages/private/cart";

export function generateMetadata(): Promise<Metadata> {
  return cartMetadata("uz");
}

export default function Page() {
  return <CartPage locale="uz" />;
}
