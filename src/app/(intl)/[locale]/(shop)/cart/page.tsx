import type { Metadata } from "next";

import { CartPage, cartMetadata } from "@/features/shop/pages/private/cart";
import { intlLocaleFrom } from "@/features/shop/routing/intl-locale";

export function generateMetadata({ params }: PageProps<"/[locale]/cart">): Promise<Metadata> {
  return cartMetadata(intlLocaleFrom(params));
}

export default function Page({ params }: PageProps<"/[locale]/cart">) {
  return <CartPage locale={intlLocaleFrom(params)} />;
}
