import type { Metadata } from "next";
import { Suspense } from "react";

import { OrderDetailContent } from "@/features/admin/orders/order-detail-content";
import { PageSkeleton } from "@/features/admin/shared/skeleton";
import { AdminShell } from "@/features/admin/shell/admin-shell";

export async function generateMetadata({
  params,
}: PageProps<"/admin/orders/[orderId]">): Promise<Metadata> {
  const { orderId } = await params;
  return { title: `Buyurtma №${orderId}` };
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
