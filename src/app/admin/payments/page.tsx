import type { Metadata } from "next";
import { Suspense } from "react";

import { PaymentsContent } from "@/features/admin/payments/payments-content";
import { PageSkeleton } from "@/features/admin/shared/skeleton";
import { AdminShell } from "@/features/admin/shell/admin-shell";

export const metadata: Metadata = { title: "To‘lovlar" };

export default function PaymentsPage({ searchParams }: PageProps<"/admin/payments">) {
  return (
    <AdminShell section="payments">
      <Suspense fallback={<PageSkeleton />}>
        <PaymentsContent searchParams={searchParams} />
      </Suspense>
    </AdminShell>
  );
}
