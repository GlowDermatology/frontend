import { Suspense } from "react";

import { ClinicsContent } from "@/features/admin/clinics/clinics-content";
import { PageSkeleton } from "@/features/admin/shared/skeleton";
import { pageMetadata } from "@/features/admin/shell/page-metadata";

export function generateMetadata() {
  return pageMetadata("clinics");
}

export default function ClinicsPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <ClinicsContent />
    </Suspense>
  );
}
