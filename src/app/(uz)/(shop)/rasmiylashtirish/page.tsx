import type { Metadata } from "next";

import { CheckoutPage, checkoutMetadata } from "@/features/shop/pages/private/cart";

export function generateMetadata(): Promise<Metadata> {
  return checkoutMetadata("uz");
}

export default function Page() {
  return <CheckoutPage locale="uz" />;
}
