import { Suspense } from "react";

import { CashbackContent } from "@/features/admin/cashback/cashback-content";
import { PageSkeleton } from "@/features/admin/shared/skeleton";
import { pageMetadata } from "@/features/admin/shell/page-metadata";

export function generateMetadata() {
  return pageMetadata("cashback");
}

export default function CashbackSettingsPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <CashbackContent />
    </Suspense>
  );
}
