import type { Metadata } from "next";
import { Suspense } from "react";

import { getProduct } from "@/data/products";
import { productDisplayName } from "@/domain/product";
import { ProductEditContent } from "@/features/admin/products/product-edit-content";
import { PageSkeleton } from "@/features/admin/shared/skeleton";
import { AdminShell } from "@/features/admin/shell/admin-shell";

export async function generateMetadata({
  params,
}: PageProps<"/admin/products/[productId]">): Promise<Metadata> {
  const product = await getProduct((await params).productId);
  return { title: product ? productDisplayName(product) : "Mahsulot" };
}

export default function ProductEditPage({ params }: PageProps<"/admin/products/[productId]">) {
  return (
    <AdminShell section="products">
      <Suspense fallback={<PageSkeleton />}>
        <ProductEditContent params={params} />
      </Suspense>
    </AdminShell>
  );
}
