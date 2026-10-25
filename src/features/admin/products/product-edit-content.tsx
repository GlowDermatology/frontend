import { notFound } from "next/navigation";

import { requireStaff } from "@/data/auth";
import { getCategories } from "@/data/categories";
import { getCatalogStats, getProduct } from "@/data/products";

import { ProductEditor } from "./product-editor";

export async function ProductEditContent({ params }: { params: Promise<{ productId: string }> }) {
  await requireStaff();
  const { productId } = await params;
  const [product, stats, categories] = await Promise.all([
    getProduct(productId),
    getCatalogStats(),
    getCategories(),
  ]);
  if (!product) notFound();

  return (
    <ProductEditor product={product} categories={categories} lastSyncLabel={stats.lastSyncLabel} />
  );
}
