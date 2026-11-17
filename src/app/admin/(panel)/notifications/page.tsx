import { Suspense } from "react";

import { NotificationsContent } from "@/features/admin/notifications/notifications-content";
import { PageSkeleton } from "@/features/admin/shared/skeleton";
import { pageMetadata } from "@/features/admin/shell/page-metadata";

export function generateMetadata() {
  return pageMetadata("notifications");
}

export default function NotificationsPage({ searchParams }: PageProps<"/admin/notifications">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <NotificationsContent searchParams={searchParams} />
    </Suspense>
  );
}
