import type { Metadata } from "next";

import { CatalogPage, catalogMetadata } from "@/features/shop/pages/catalog";
import { intlLocaleFrom } from "@/features/shop/routing/intl-locale";

export async function generateMetadata({
  params,
  searchParams,
}: PageProps<"/[locale]/catalog">): Promise<Metadata> {
  return catalogMetadata(await intlLocaleFrom(params), searchParams);
}

export default async function Page({ params, searchParams }: PageProps<"/[locale]/catalog">) {
  return <CatalogPage locale={await intlLocaleFrom(params)} searchParams={searchParams} />;
}
