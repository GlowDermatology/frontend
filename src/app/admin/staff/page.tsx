import type { Metadata } from "next";
import { Suspense } from "react";

import { PageSkeleton } from "@/features/admin/shared/skeleton";
import { AdminShell } from "@/features/admin/shell/admin-shell";
import { StaffContent } from "@/features/admin/staff/staff-content";

export const metadata: Metadata = { title: "Xodimlar" };

export default function StaffPage({ searchParams }: PageProps<"/admin/staff">) {
  return (
    <AdminShell section="staff">
      <Suspense fallback={<PageSkeleton />}>
        <StaffContent searchParams={searchParams} />
      </Suspense>
    </AdminShell>
  );
}
