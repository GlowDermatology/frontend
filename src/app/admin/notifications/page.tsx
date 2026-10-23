import type { Metadata } from "next";
import { Suspense } from "react";

import { NotificationsContent } from "@/features/admin/notifications/notifications-content";
import { PageSkeleton } from "@/features/admin/shared/skeleton";
import { AdminShell } from "@/features/admin/shell/admin-shell";

export const metadata: Metadata = { title: "Bildirishnomalar" };

export default function NotificationsPage({ searchParams }: PageProps<"/admin/notifications">) {
  return (
    <AdminShell section="notifications">
      <Suspense fallback={<PageSkeleton />}>
        <NotificationsContent searchParams={searchParams} />
      </Suspense>
    </AdminShell>
  );
}
