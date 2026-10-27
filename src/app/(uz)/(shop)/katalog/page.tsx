import type { Metadata } from "next";

import { CatalogPage, catalogMetadata } from "@/features/shop/pages/catalog";

export function generateMetadata({ searchParams }: PageProps<"/katalog">): Promise<Metadata> {
  return catalogMetadata("uz", searchParams);
}

export default function Page({ searchParams }: PageProps<"/katalog">) {
  return <CatalogPage locale="uz" searchParams={searchParams} />;
}
