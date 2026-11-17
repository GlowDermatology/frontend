import { Suspense } from "react";

import { BannersContent } from "@/features/admin/banners/banners-content";
import { PageSkeleton } from "@/features/admin/shared/skeleton";
import { pageMetadata } from "@/features/admin/shell/page-metadata";

export function generateMetadata() {
  return pageMetadata("banners");
}

export default function BannersPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <BannersContent />
    </Suspense>
  );
}
