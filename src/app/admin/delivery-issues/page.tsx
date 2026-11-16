import type { Metadata } from "next";
import { Suspense } from "react";

import { IssuesContent } from "@/features/admin/issues/issues-content";
import { PageSkeleton } from "@/features/admin/shared/skeleton";
import { AdminShell } from "@/features/admin/shell/admin-shell";

export const metadata: Metadata = { title: "Muammolar" };

/** The delivery exception queue; the Telegram bot links here (`…/admin/delivery-issues`). */
export default function DeliveryIssuesPage({ searchParams }: PageProps<"/admin/delivery-issues">) {
  return (
    <AdminShell section="delivery-issues">
      <Suspense fallback={<PageSkeleton />}>
        <IssuesContent searchParams={searchParams} />
      </Suspense>
    </AdminShell>
  );
}
