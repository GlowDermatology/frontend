import { Suspense } from "react";

import { PageSkeleton } from "@/features/admin/shared/skeleton";
import { pageMetadata } from "@/features/admin/shell/page-metadata";
import { SpecialistsContent } from "@/features/admin/specialists/specialists-content";

export function generateMetadata() {
  return pageMetadata("specialists");
}

export default function SpecialistsPage({ searchParams }: PageProps<"/admin/specialists">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <SpecialistsContent searchParams={searchParams} />
    </Suspense>
  );
}
