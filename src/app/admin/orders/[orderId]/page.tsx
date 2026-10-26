import type { Metadata } from "next";
import { Suspense } from "react";

import { getOrder } from "@/data/orders";
import { OrderDetailContent } from "@/features/admin/orders/order-detail-content";
import { PageSkeleton } from "@/features/admin/shared/skeleton";
import { AdminShell } from "@/features/admin/shell/admin-shell";

export async function generateMetadata({
  params,
}: PageProps<"/admin/orders/[orderId]">): Promise<Metadata> {
  // `getOrder` is wrapped in `cache()` (and reads through `cachedGet`), so the
  // page body's read of the same order reuses this one: Django is hit once.
  const { orderId } = await params;
  const order = /^\d{1,12}$/.test(orderId) ? await getOrder(Number(orderId)) : null;
  return { title: order ? `Buyurtma №${order.id}` : "Buyurtma topilmadi" };
}

export default function OrderDetailPage({ params }: PageProps<"/admin/orders/[orderId]">) {
  return (
    <AdminShell section="orders">
      <Suspense fallback={<PageSkeleton />}>
        <OrderDetailContent params={params} />
      </Suspense>
    </AdminShell>
  );
}
