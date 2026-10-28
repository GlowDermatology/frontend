import type { Metadata } from "next";

import { CategoryPage, categoryMetadata } from "@/features/shop/pages/catalog";

export function generateMetadata({
  params,
  searchParams,
}: PageProps<"/kategoriyalar/[slug]">): Promise<Metadata> {
  return categoryMetadata("uz", params, searchParams);
}

export default function Page({ params, searchParams }: PageProps<"/kategoriyalar/[slug]">) {
  return <CategoryPage locale="uz" params={params} searchParams={searchParams} />;
}
