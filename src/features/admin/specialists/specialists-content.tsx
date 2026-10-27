import { optionalRead } from "@/data/api/optional-read";
import { requireStaff } from "@/data/auth";
import { getLocation, listSpecialists } from "@/data/clinic";
import { listStaff } from "@/data/staff";

import type { SearchParams } from "../shared/url-state";
import { LocationCard } from "./location-card";
import { parseSpecialistQuery } from "./query";
import { SpecialistsView } from "./specialists-view";

/**
 * Data boundary of `/admin/specialists` (gap FND-1, contract §2.17): the
 * list the URL names, the clinic card, and the staff accounts a specialist
 * can be linked to (optional: without them the picker offers none).
 */
export async function SpecialistsContent({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await requireStaff();
  const query = parseSpecialistQuery(await searchParams);
  const [page, location, staff] = await Promise.all([
    listSpecialists(query),
    getLocation(),
    optionalRead("specialist staff options", listStaff, []),
  ]);
  return (
    <>
      <SpecialistsView
        page={page}
        query={query}
        staffOptions={staff.map((s) => ({ id: s.id, name: `${s.name} · ${s.email}` }))}
        hasClinic={location !== null}
      />
      <LocationCard location={location} />
    </>
  );
}
