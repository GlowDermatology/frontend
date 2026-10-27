import type { Metadata } from "next";
import { Suspense } from "react";

import { MembersContent } from "@/features/admin/groups/members-content";
import { PageSkeleton } from "@/features/admin/shared/skeleton";
import { AdminShell } from "@/features/admin/shell/admin-shell";

export const metadata: Metadata = { title: "Guruh a’zolari" };

export default function GroupMembersPage({
  params,
  searchParams,
}: PageProps<"/admin/customers/groups/[segmentId]">) {
  return (
    <AdminShell section="customers">
      <Suspense fallback={<PageSkeleton />}>
        <MembersContent params={params} searchParams={searchParams} />
      </Suspense>
    </AdminShell>
  );
}
