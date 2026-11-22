import { Suspense } from "react";

import { PageSkeleton } from "@/features/admin/shared/skeleton";
import { pageMetadata } from "@/features/admin/shell/page-metadata";
import { WorkspacePlaceholder } from "@/features/admin/workspace/placeholder";

export function generateMetadata() {
  return pageMetadata("my-services");
}

export default function MyServicesPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <WorkspacePlaceholder section="my-services" />
    </Suspense>
  );
}
