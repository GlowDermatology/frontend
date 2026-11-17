import { Suspense } from "react";

import { IssuesContent } from "@/features/admin/issues/issues-content";
import { PageSkeleton } from "@/features/admin/shared/skeleton";
import { pageMetadata } from "@/features/admin/shell/page-metadata";

export function generateMetadata() {
  return pageMetadata("delivery-issues");
}

/** The delivery exception queue; the Telegram bot links here (`…/admin/delivery-issues`). */
export default function DeliveryIssuesPage({ searchParams }: PageProps<"/admin/delivery-issues">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <IssuesContent searchParams={searchParams} />
    </Suspense>
  );
}
