import { requireStaff } from "@/data/auth";
import { getSegment, listSegmentMembers } from "@/data/segments";

import { AdminNotFound } from "../shared/admin-not-found";
import { firstParam, positiveInt, type SearchParams } from "../shared/url-state";
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
    return (
      <AdminNotFound
        title="Guruh topilmadi"
        description="Guruh o‘chirilgan yoki manzil noto‘g‘ri."
        backHref="/admin/customers/groups"
        backLabel="Guruhlar"
      />
    );
  }
  const page = await listSegmentMembers(segment.id, positiveInt(firstParam(query, "page"), 1));
  return <MembersView key={segment.id} segment={segment} page={page} />;
}
