import { requireAdmin } from "@/data/auth";
import { listClinics, listSpecialists } from "@/data/clinic";

import type { SearchParams } from "../shared/url-state";
import { parseSpecialistQuery } from "./query";
import { SpecialistsView } from "./specialists-view";

export async function SpecialistsContent({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await requireAdmin();
  const query = parseSpecialistQuery(await searchParams);
  const [page, clinics] = await Promise.all([listSpecialists(query), listClinics()]);
  return <SpecialistsView page={page} query={query} clinics={clinics} />;
}
