import { requireStaff } from "@/data/auth";
import { listSegments } from "@/data/segments";

import { firstParam, positiveInt, type SearchParams } from "../shared/url-state";
import { GroupsView } from "./groups-view";

/** Data boundary of /admin/customers/groups (`?page=`). */
export async function GroupsContent({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await requireStaff();
  const page = positiveInt(firstParam(await searchParams, "page"), 1);
  return <GroupsView page={await listSegments(page)} />;
}
