import type { Metadata } from "next";

import { ProductPage, productMetadata } from "@/features/shop/pages/product";

export function generateMetadata({ params }: PageProps<"/mahsulotlar/[slug]">): Promise<Metadata> {
  return productMetadata("uz", params);
}

export default function Page({ params }: PageProps<"/mahsulotlar/[slug]">) {
  return <ProductPage locale="uz" params={params} />;
}
