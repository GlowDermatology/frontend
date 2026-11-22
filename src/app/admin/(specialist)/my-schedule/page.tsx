import { Suspense } from "react";

import { PageSkeleton } from "@/features/admin/shared/skeleton";
import { pageMetadata } from "@/features/admin/shell/page-metadata";
import { WorkspacePlaceholder } from "@/features/admin/workspace/placeholder";

export function generateMetadata() {
  return pageMetadata("my-schedule");
}

export default function MySchedulePage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <WorkspacePlaceholder section="my-schedule" />
    </Suspense>
  );
}
