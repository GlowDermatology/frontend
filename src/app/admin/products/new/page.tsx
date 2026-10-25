import type { Metadata } from "next";
import { Suspense } from "react";

import { requireStaff } from "@/data/auth";
import { ProductEditor } from "@/features/admin/products/product-editor";
import { PageSkeleton } from "@/features/admin/shared/skeleton";
import { AdminShell } from "@/features/admin/shell/admin-shell";

export const metadata: Metadata = { title: "Yangi mahsulot" };

async function NewProductContent() {
  await requireStaff();
  return <ProductEditor product={null} lastSyncLabel="" />;
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
