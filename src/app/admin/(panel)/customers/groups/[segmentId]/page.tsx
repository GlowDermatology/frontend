import { Suspense } from "react";

import { MembersContent } from "@/features/admin/groups/members-content";
import { PageSkeleton } from "@/features/admin/shared/skeleton";
import { pageMetadata } from "@/features/admin/shell/page-metadata";

export function generateMetadata() {
  return pageMetadata("groupMembers");
}

export default function GroupMembersPage({
  params,
  searchParams,
}: PageProps<"/admin/customers/groups/[segmentId]">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <MembersContent params={params} searchParams={searchParams} />
    </Suspense>
  );
}
