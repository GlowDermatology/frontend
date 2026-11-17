import { Suspense } from "react";

import { PageSkeleton } from "@/features/admin/shared/skeleton";
import { pageMetadata } from "@/features/admin/shell/page-metadata";
import { StaffContent } from "@/features/admin/staff/staff-content";

export function generateMetadata() {
  return pageMetadata("staff");
}

export default function StaffPage({ searchParams }: PageProps<"/admin/staff">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <StaffContent searchParams={searchParams} />
    </Suspense>
  );
}
