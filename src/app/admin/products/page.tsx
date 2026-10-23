import type { Metadata } from "next";
import { Suspense } from "react";

import { ProductsContent } from "@/features/admin/products/products-content";
import { PageSkeleton } from "@/features/admin/shared/skeleton";
import { AdminShell } from "@/features/admin/shell/admin-shell";

export const metadata: Metadata = { title: "Mahsulotlar" };

export default function ProductsPage({ searchParams }: PageProps<"/admin/products">) {
  return (
    <AdminShell section="products">
      <Suspense fallback={<PageSkeleton />}>
        <ProductsContent searchParams={searchParams} />
      </Suspense>
    </AdminShell>
  );
}
