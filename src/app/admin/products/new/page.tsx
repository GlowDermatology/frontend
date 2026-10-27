import type { Metadata } from "next";
import { Suspense } from "react";

import { requireStaff } from "@/data/auth";
import { getCategories } from "@/data/categories";
import { dataSource } from "@/data/source";
import { ProductEditor } from "@/features/admin/products/product-editor";
import { PageSkeleton } from "@/features/admin/shared/skeleton";
import { AdminShell } from "@/features/admin/shell/admin-shell";

export const metadata: Metadata = { title: "Yangi mahsulot" };

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
    <AdminShell section="products">
      <Suspense fallback={<PageSkeleton />}>
        <NewProductContent />
      </Suspense>
    </AdminShell>
  );
}
