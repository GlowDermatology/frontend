import type { Metadata } from "next";
import { Suspense } from "react";

import { DashboardContent } from "@/features/admin/dashboard/dashboard-content";
import { PageSkeleton } from "@/features/admin/shared/skeleton";
import { AdminShell } from "@/features/admin/shell/admin-shell";

export const metadata: Metadata = { title: "Dashboard" };

export default function AdminDashboardPage({ searchParams }: PageProps<"/admin">) {
  return (
    <AdminShell section="dashboard">
      <Suspense fallback={<PageSkeleton />}>
        <DashboardContent searchParams={searchParams} />
      </Suspense>
    </AdminShell>
  );
}
