import type { Metadata } from "next";

import { CheckoutPage, checkoutMetadata } from "@/features/shop/pages/private/cart";
import { intlLocaleFrom } from "@/features/shop/routing/intl-locale";

export function generateMetadata({ params }: PageProps<"/[locale]/checkout">): Promise<Metadata> {
  return checkoutMetadata(intlLocaleFrom(params));
}

export default function Page({ params }: PageProps<"/[locale]/checkout">) {
  return <CheckoutPage locale={intlLocaleFrom(params)} />;
}
