import { requireStaff } from "@/data/auth";
import { listServices } from "@/data/clinic";

import type { SearchParams } from "../shared/url-state";
import { parseServiceQuery } from "../specialists/query";
import { ServicesView } from "./services-view";

/** Data boundary of `/admin/services` (contract §2.17 `GET services/`). */
export async function ServicesContent({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await requireStaff();
  const query = parseServiceQuery(await searchParams);
  const page = await listServices(query);
  return <ServicesView page={page} query={query} />;
}
