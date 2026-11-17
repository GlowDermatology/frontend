import { Suspense } from "react";

import { OrdersContent } from "@/features/admin/orders/orders-content";
import { PageSkeleton } from "@/features/admin/shared/skeleton";
import { pageMetadata } from "@/features/admin/shell/page-metadata";

export function generateMetadata() {
  return pageMetadata("orders");
}

export default function OrdersPage({ searchParams }: PageProps<"/admin/orders">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <OrdersContent searchParams={searchParams} />
    </Suspense>
  );
}
