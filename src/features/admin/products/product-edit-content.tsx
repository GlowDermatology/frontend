import { notFound } from "next/navigation";

import { getAssistantStatus } from "@/data/assistant";
import { requireStaff } from "@/data/auth";
import { getCategories } from "@/data/categories";
import { requestNow } from "@/data/now";
import { getCatalogStats, getProduct } from "@/data/products";
import { catalogDataCopy } from "@/domain/copy/catalog";
import { getAdminLocale, getFormat } from "@/lib/i18n/admin-locale";

import { ProductEditor } from "./product-editor";

export async function ProductEditContent({ params }: { params: Promise<{ productId: string }> }) {
  await requireStaff();
  const { productId } = await params;
  const [product, stats, categories, fmt, locale, now, assistant] = await Promise.all([
    getProduct(productId),
    getCatalogStats(),
    getCategories(),
    getFormat(),
    getAdminLocale(),
    requestNow(),
    getAssistantStatus(),
  ]);
  if (!product) notFound();
  // When stock was last read from Billz, relative to the server's now, in the admin language.
  const lastSync = stats.lastSyncAt
    ? fmt.ago(stats.lastSyncAt, now)
    : catalogDataCopy[locale].neverSynced;

  return (
    <ProductEditor
      product={product}
      assistant={assistant}
      categories={categories}
      lastSyncLabel={lastSync}
    />
  );
}
