import { notFound } from "next/navigation";

import { getCatalogStats, getProduct } from "@/data/products";

import { ProductEditor } from "./product-editor";

export async function ProductEditContent({ params }: { params: Promise<{ productId: string }> }) {
  const { productId } = await params;
  const [product, stats] = await Promise.all([getProduct(productId), getCatalogStats()]);
  if (!product) notFound();

  return <ProductEditor product={product} lastSyncLabel={stats.lastSyncLabel} />;
}
