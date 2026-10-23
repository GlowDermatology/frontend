import type { Metadata } from "next";
import { Suspense } from "react";

import { getCustomer } from "@/data/customers";
import { CustomerContent } from "@/features/admin/customers/customer-content";
import { PageSkeleton } from "@/features/admin/shared/skeleton";
import { AdminShell } from "@/features/admin/shell/admin-shell";

export async function generateMetadata({
  params,
}: PageProps<"/admin/customers/[customerId]">): Promise<Metadata> {
  const customer = await getCustomer((await params).customerId);
  return { title: customer?.name ?? "Mijoz" };
}

export default function CustomerPage({ params }: PageProps<"/admin/customers/[customerId]">) {
  return (
    <AdminShell section="customers">
      <Suspense fallback={<PageSkeleton />}>
        <CustomerContent params={params} />
      </Suspense>
    </AdminShell>
  );
}
