import type { Metadata } from "next";

import { ProductPage, productMetadata } from "@/features/shop/pages/product";
import { intlLocaleFrom } from "@/features/shop/routing/intl-locale";

export function generateMetadata({
  params,
}: PageProps<"/[locale]/products/[slug]">): Promise<Metadata> {
  return productMetadata(intlLocaleFrom(params), params);
}

export default function Page({ params }: PageProps<"/[locale]/products/[slug]">) {
  return <ProductPage locale={intlLocaleFrom(params)} params={params} />;
}
