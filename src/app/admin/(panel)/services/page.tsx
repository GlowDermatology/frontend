import { Suspense } from "react";

import { ServicesContent } from "@/features/admin/services/services-content";
import { PageSkeleton } from "@/features/admin/shared/skeleton";
import { pageMetadata } from "@/features/admin/shell/page-metadata";

export function generateMetadata() {
  return pageMetadata("services");
}

export default function ServicesPage({ searchParams }: PageProps<"/admin/services">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <ServicesContent searchParams={searchParams} />
    </Suspense>
  );
}
