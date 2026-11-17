import { requireStaff } from "@/data/auth";
import { getSegment, listSegmentMembers } from "@/data/segments";
import { copyFor } from "@/lib/i18n/admin-locale";

import { AdminNotFound } from "../shared/admin-not-found";
import { firstParam, positiveInt, type SearchParams } from "../shared/url-state";
import { groupsCopy } from "./copy";
import { MembersView } from "./members-view";

/** Data boundary of /admin/customers/groups/[segmentId] (`?page=`). */
export async function MembersContent({
  params,
  searchParams,
}: {
  params: Promise<{ segmentId: string }>;
  searchParams: Promise<SearchParams>;
}) {
  await requireStaff();
  const [{ segmentId }, query] = await Promise.all([params, searchParams]);
  const segment = await getSegment(segmentId);
  if (!segment) {
    const t = await copyFor(groupsCopy);
    return (
      <AdminNotFound
        title={t.members.notFoundTitle}
        description={t.members.notFoundText}
        backHref="/admin/customers/groups"
        backLabel={t.crumbs.groups}
      />
    );
  }
  const page = await listSegmentMembers(segment.id, positiveInt(firstParam(query, "page"), 1));
  return <MembersView key={segment.id} segment={segment} page={page} />;
}
