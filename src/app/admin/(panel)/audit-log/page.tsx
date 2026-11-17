import { Suspense } from "react";

import { AuditContent } from "@/features/admin/audit-log/audit-content";
import { PageSkeleton } from "@/features/admin/shared/skeleton";
import { pageMetadata } from "@/features/admin/shell/page-metadata";

export function generateMetadata() {
  return pageMetadata("audit-log");
}

export default function AuditLogPage({ searchParams }: PageProps<"/admin/audit-log">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <AuditContent searchParams={searchParams} />
    </Suspense>
  );
}
