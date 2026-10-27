import type { Metadata } from "next";
import { Suspense } from "react";

import { PageSkeleton } from "@/features/admin/shared/skeleton";
import { AdminShell } from "@/features/admin/shell/admin-shell";
import { SpecialistsContent } from "@/features/admin/specialists/specialists-content";

export const metadata: Metadata = { title: "Mutaxassislar" };

export default function SpecialistsPage({ searchParams }: PageProps<"/admin/specialists">) {
  return (
    <AdminShell section="specialists">
      <Suspense fallback={<PageSkeleton />}>
        <SpecialistsContent searchParams={searchParams} />
      </Suspense>
    </AdminShell>
  );
}
