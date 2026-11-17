import { Suspense } from "react";

import { GroupsContent } from "@/features/admin/groups/groups-content";
import { PageSkeleton } from "@/features/admin/shared/skeleton";
import { pageMetadata } from "@/features/admin/shell/page-metadata";

export function generateMetadata() {
  return pageMetadata("groups");
}

export default function GroupsPage({ searchParams }: PageProps<"/admin/customers/groups">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <GroupsContent searchParams={searchParams} />
    </Suspense>
  );
}
