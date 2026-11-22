import { Suspense } from "react";

import { PageSkeleton } from "@/features/admin/shared/skeleton";
import { pageMetadata } from "@/features/admin/shell/page-metadata";
import { MyScheduleContent } from "@/features/admin/workspace/my-schedule-content";

export function generateMetadata() {
  return pageMetadata("my-schedule");
}

export default function MySchedulePage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <MyScheduleContent />
    </Suspense>
  );
}
