import type { Metadata } from "next";
import { Suspense } from "react";

import { CustomersContent } from "@/features/admin/customers/customers-content";
import { PageSkeleton } from "@/features/admin/shared/skeleton";
import { AdminShell } from "@/features/admin/shell/admin-shell";

export const metadata: Metadata = { title: "Mijozlar" };

export default function CustomersPage({ searchParams }: PageProps<"/admin/customers">) {
  return (
    <AdminShell section="customers">
      <Suspense fallback={<PageSkeleton />}>
        <CustomersContent searchParams={searchParams} />
      </Suspense>
    </AdminShell>
  );
}
