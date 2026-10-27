import type { Metadata } from "next";
import { Suspense } from "react";

import { AuditContent } from "@/features/admin/audit-log/audit-content";
import { PageSkeleton } from "@/features/admin/shared/skeleton";
import { AdminShell } from "@/features/admin/shell/admin-shell";

export const metadata: Metadata = { title: "Harakatlar jurnali" };

export default function AuditLogPage({ searchParams }: PageProps<"/admin/audit-log">) {
  return (
    <AdminShell section="audit-log">
      <Suspense fallback={<PageSkeleton />}>
        <AuditContent searchParams={searchParams} />
      </Suspense>
    </AdminShell>
  );
}
