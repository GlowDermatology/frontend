import type { Metadata } from "next";
import { Suspense } from "react";

import { OrdersContent } from "@/features/admin/orders/orders-content";
import { PageSkeleton } from "@/features/admin/shared/skeleton";
import { AdminShell } from "@/features/admin/shell/admin-shell";

export const metadata: Metadata = { title: "Buyurtmalar" };

export default function OrdersPage({ searchParams }: PageProps<"/admin/orders">) {
  return (
    <AdminShell section="orders">
      <Suspense fallback={<PageSkeleton />}>
        <OrdersContent searchParams={searchParams} />
      </Suspense>
    </AdminShell>
  );
}
