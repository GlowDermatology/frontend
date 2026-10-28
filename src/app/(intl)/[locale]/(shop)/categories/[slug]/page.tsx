import type { Metadata } from "next";

import { CategoryPage, categoryMetadata } from "@/features/shop/pages/catalog";
import { intlLocaleFrom } from "@/features/shop/routing/intl-locale";

export function generateMetadata({
  params,
  searchParams,
}: PageProps<"/[locale]/categories/[slug]">): Promise<Metadata> {
  return categoryMetadata(intlLocaleFrom(params), params, searchParams);
}

export default function Page({ params, searchParams }: PageProps<"/[locale]/categories/[slug]">) {
  return (
    <CategoryPage locale={intlLocaleFrom(params)} params={params} searchParams={searchParams} />
  );
}
