import { notFound } from "next/navigation";

import { optionalRead } from "@/data/api/optional-read";
import { getMe, requireAdmin } from "@/data/auth";
import {
  getSpecialist,
  listClinics,
  listBlocks,
  listConflicts,
  listOverrides,
} from "@/data/clinic";
import { requestNow } from "@/data/now";
import { toLocalIsoDate } from "@/lib/format";

import { SpecialistDetailView } from "./specialist-detail-view";

/**
 * Data boundary of `/admin/specialists/[specialistId]` (gap FND-1, contract
 * §2.17): the profile with its own services and weekly hours, the date
 * overrides and blocked periods ahead, and the
 * open appointments the schedule no longer covers.
 */
export async function SpecialistDetailContent({
  params,
}: {
  params: Promise<{ specialistId: string }>;
}) {
  await requireAdmin();
  const me = await getMe();
  const { specialistId } = await params;
  const specialist = await getSpecialist(specialistId);
  if (!specialist) notFound();
  const [clinics, overrides, blocks, conflicts, now] = await Promise.all([
    listClinics(),
    listOverrides(specialist.id),
    listBlocks(specialist.id),
    optionalRead("specialist conflicts", () => listConflicts(specialist.id), []),
    requestNow(),
  ]);
  return (
    <SpecialistDetailView
      specialist={specialist}
      manageAccess={Boolean(me?.is_manager || me?.is_superuser)}
      clinics={clinics}
      overrides={overrides.items}
      blocks={blocks.items}
      conflicts={conflicts}
      today={toLocalIsoDate(now)}
    />
  );
}
