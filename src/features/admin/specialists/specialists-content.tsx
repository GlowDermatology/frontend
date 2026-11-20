import { optionalRead } from "@/data/api/optional-read";
import { requireStaff } from "@/data/auth";
import { listClinics, listSpecialists } from "@/data/clinic";
import { listStaff } from "@/data/staff";

import type { SearchParams } from "../shared/url-state";
import { parseSpecialistQuery } from "./query";
import { SpecialistsView } from "./specialists-view";

/**
 * Data boundary of `/admin/specialists` (gap FND-1, contract §2.17): the
 * requested directory page, clinics, and the staff accounts a specialist
 * can be linked to (optional: without them the picker offers none).
 */
export async function SpecialistsContent({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await requireStaff();
  const query = parseSpecialistQuery(await searchParams);
  const [page, clinics, staff] = await Promise.all([
    listSpecialists(query),
    listClinics(),
    optionalRead("specialist staff options", listStaff, []),
  ]);
  return (
    <SpecialistsView
      page={page}
      query={query}
      staffOptions={staff.map((s) => ({ id: s.id, name: `${s.name} · ${s.email}` }))}
      clinics={clinics}
    />
  );
}
