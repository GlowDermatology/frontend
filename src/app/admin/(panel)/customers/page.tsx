import { Suspense } from "react";

import { CustomersContent } from "@/features/admin/customers/customers-content";
import { PageSkeleton } from "@/features/admin/shared/skeleton";
import { pageMetadata } from "@/features/admin/shell/page-metadata";

export function generateMetadata() {
  return pageMetadata("customers");
}

export default function CustomersPage({ searchParams }: PageProps<"/admin/customers">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <CustomersContent searchParams={searchParams} />
    </Suspense>
  );
}
