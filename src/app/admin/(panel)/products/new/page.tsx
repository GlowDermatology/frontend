import { Suspense } from "react";

import { requireStaff } from "@/data/auth";
import { getCategories } from "@/data/categories";
import { dataSource } from "@/data/source";
import { ProductEditor } from "@/features/admin/products/product-editor";
import { PageSkeleton } from "@/features/admin/shared/skeleton";
import { pageMetadata } from "@/features/admin/shell/page-metadata";

export function generateMetadata() {
  return pageMetadata("newProduct");
}

async function NewProductContent() {
  await requireStaff();
  // Only API ids are routable; the demo keeps the created draft in place.
  const [redirectOnCreate, categories] = await Promise.all([
    dataSource().then((source) => source === "api"),
    getCategories(),
  ]);
  return (
    <ProductEditor
      product={null}
      categories={categories}
      lastSyncLabel=""
      redirectOnCreate={redirectOnCreate}
    />
  );
}

export default function NewProductPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <NewProductContent />
    </Suspense>
  );
}
