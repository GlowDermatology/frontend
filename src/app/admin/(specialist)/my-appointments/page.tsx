import { Suspense } from "react";

import { PageSkeleton } from "@/features/admin/shared/skeleton";
import { pageMetadata } from "@/features/admin/shell/page-metadata";
import { MyAppointmentsContent } from "@/features/admin/workspace/my-appointments-content";

export function generateMetadata() {
  return pageMetadata("my-appointments");
}

export default function MyAppointmentsPage({ searchParams }: PageProps<"/admin/my-appointments">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <MyAppointmentsContent searchParams={searchParams} />
    </Suspense>
  );
}
