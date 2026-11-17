import { Suspense } from "react";

import { PaymentsContent } from "@/features/admin/payments/payments-content";
import { PageSkeleton } from "@/features/admin/shared/skeleton";
import { pageMetadata } from "@/features/admin/shell/page-metadata";

export function generateMetadata() {
  return pageMetadata("payments");
}

export default function PaymentsPage({ searchParams }: PageProps<"/admin/payments">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <PaymentsContent searchParams={searchParams} />
    </Suspense>
  );
}
