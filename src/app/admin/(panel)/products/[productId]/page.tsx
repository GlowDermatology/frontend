import type { Metadata } from "next";
import { Suspense } from "react";

import { getProduct } from "@/data/products";
import { productDisplayName } from "@/domain/product";
import { ProductEditContent } from "@/features/admin/products/product-edit-content";
import { PageSkeleton } from "@/features/admin/shared/skeleton";
import { pageTitles } from "@/features/admin/shell/page-metadata";

export async function generateMetadata({
  params,
}: PageProps<"/admin/products/[productId]">): Promise<Metadata> {
  const [product, titles] = await Promise.all([
    params.then(({ productId }) => getProduct(productId)),
    pageTitles(),
  ]);
  return { title: product ? productDisplayName(product) : titles.product };
}

export default function ProductEditPage({ params }: PageProps<"/admin/products/[productId]">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <ProductEditContent params={params} />
    </Suspense>
  );
}
