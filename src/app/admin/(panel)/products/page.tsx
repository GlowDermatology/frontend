import { Suspense } from "react";

import { ProductsContent } from "@/features/admin/products/products-content";
import { PageSkeleton } from "@/features/admin/shared/skeleton";
import { pageMetadata } from "@/features/admin/shell/page-metadata";

export function generateMetadata() {
  return pageMetadata("products");
}

export default function ProductsPage({ searchParams }: PageProps<"/admin/products">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <ProductsContent searchParams={searchParams} />
    </Suspense>
  );
}
