import type { Metadata } from "next";
import { Suspense } from "react";

import { GroupsContent } from "@/features/admin/groups/groups-content";
import { PageSkeleton } from "@/features/admin/shared/skeleton";
import { AdminShell } from "@/features/admin/shell/admin-shell";

export const metadata: Metadata = { title: "Guruhlar" };

export default function GroupsPage({ searchParams }: PageProps<"/admin/customers/groups">) {
  return (
    <AdminShell section="customers">
      <Suspense fallback={<PageSkeleton />}>
        <GroupsContent searchParams={searchParams} />
      </Suspense>
    </AdminShell>
  );
}
