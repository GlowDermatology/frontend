import type { Metadata } from "next";
import { Suspense } from "react";

import { ServicesContent } from "@/features/admin/services/services-content";
import { PageSkeleton } from "@/features/admin/shared/skeleton";
import { AdminShell } from "@/features/admin/shell/admin-shell";

export const metadata: Metadata = { title: "Xizmatlar" };

export default function ServicesPage({ searchParams }: PageProps<"/admin/services">) {
  return (
    <AdminShell section="services">
      <Suspense fallback={<PageSkeleton />}>
        <ServicesContent searchParams={searchParams} />
      </Suspense>
    </AdminShell>
  );
}
