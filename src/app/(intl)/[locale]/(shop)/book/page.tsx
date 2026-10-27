import type { Metadata } from "next";

import { PlaceholderPage, placeholderMetadata } from "@/features/shop/pages/placeholder";
import { intlLocaleFrom } from "@/features/shop/routing/intl-locale";

/** W3a placeholder (noindex); W3b replaces it with the real screen. */
export async function generateMetadata({ params }: PageProps<"/[locale]/book">): Promise<Metadata> {
  return placeholderMetadata(await intlLocaleFrom(params), "booking");
}

export default async function Page({ params }: PageProps<"/[locale]/book">) {
  return <PlaceholderPage locale={await intlLocaleFrom(params)} kind="booking" />;
}
