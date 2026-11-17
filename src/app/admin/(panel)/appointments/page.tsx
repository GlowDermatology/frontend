import { Suspense } from "react";

import { AppointmentsContent } from "@/features/admin/appointments/appointments-content";
import { PageSkeleton } from "@/features/admin/shared/skeleton";
import { pageMetadata } from "@/features/admin/shell/page-metadata";

export function generateMetadata() {
  return pageMetadata("appointments");
}

export default function AppointmentsPage({ searchParams }: PageProps<"/admin/appointments">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <AppointmentsContent searchParams={searchParams} />
    </Suspense>
  );
}
