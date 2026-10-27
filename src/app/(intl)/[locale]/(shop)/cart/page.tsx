import type { Metadata } from "next";

import { PlaceholderPage, placeholderMetadata } from "@/features/shop/pages/placeholder";
import { intlLocaleFrom } from "@/features/shop/routing/intl-locale";

/** W3a placeholder (noindex); W3b replaces it with the real screen. */
export async function generateMetadata({ params }: PageProps<"/[locale]/cart">): Promise<Metadata> {
  return placeholderMetadata(await intlLocaleFrom(params), "cart");
}

export default async function Page({ params }: PageProps<"/[locale]/cart">) {
  return <PlaceholderPage locale={await intlLocaleFrom(params)} kind="cart" />;
}
