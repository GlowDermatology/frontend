import type { Metadata } from "next";
import { Suspense } from "react";

import { getOrder } from "@/data/orders";
import { OrderDetailContent } from "@/features/admin/orders/order-detail-content";
import { PageSkeleton } from "@/features/admin/shared/skeleton";
import { pageTitles } from "@/features/admin/shell/page-metadata";

export async function generateMetadata({
  params,
}: PageProps<"/admin/orders/[orderId]">): Promise<Metadata> {
  // `getOrder` is wrapped in `cache()` (and reads through `cachedGet`), so the
  // page body's read of the same order reuses this one: Django is hit once.
  const { orderId } = await params;
  const [order, titles] = await Promise.all([
    /^\d{1,12}$/.test(orderId) ? getOrder(Number(orderId)) : null,
    pageTitles(),
  ]);
  return { title: order ? titles.order(order.id) : titles.orderNotFound };
}

export default function OrderDetailPage({ params }: PageProps<"/admin/orders/[orderId]">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <OrderDetailContent params={params} />
    </Suspense>
  );
}
