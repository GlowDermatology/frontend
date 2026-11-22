import { Suspense } from "react";

import { PageSkeleton } from "@/features/admin/shared/skeleton";
import { pageMetadata } from "@/features/admin/shell/page-metadata";
import { MyServicesContent } from "@/features/admin/workspace/my-services-content";

export function generateMetadata() {
  return pageMetadata("my-services");
}

export default function MyServicesPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <MyServicesContent />
    </Suspense>
  );
}
