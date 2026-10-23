import type { Metadata } from "next";
import { Suspense } from "react";

import { AppointmentsContent } from "@/features/admin/appointments/appointments-content";
import { PageSkeleton } from "@/features/admin/shared/skeleton";
import { AdminShell } from "@/features/admin/shell/admin-shell";

export const metadata: Metadata = { title: "Qabullar" };

export default function AppointmentsPage({ searchParams }: PageProps<"/admin/appointments">) {
  return (
    <AdminShell section="appointments">
      <Suspense fallback={<PageSkeleton />}>
        <AppointmentsContent searchParams={searchParams} />
      </Suspense>
    </AdminShell>
  );
}
