import { notFound } from "next/navigation";

import { optionalRead } from "@/data/api/optional-read";
import { requireStaff } from "@/data/auth";
import {
  getSpecialist,
  listAllServices,
  listBlocks,
  listConflicts,
  listOverrides,
} from "@/data/clinic";
import { requestNow } from "@/data/now";
import { listStaff } from "@/data/staff";
import { toLocalIsoDate } from "@/lib/format";

import { SpecialistDetailView } from "./specialist-detail-view";

/**
 * Data boundary of `/admin/specialists/[specialistId]` (gap FND-1, contract
 * §2.17): the profile with its offers and weekly hours, every service for
 * the offer editor, the date overrides and blocked periods ahead, and the
 * open appointments the schedule no longer covers.
 */
export async function SpecialistDetailContent({
  params,
}: {
  params: Promise<{ specialistId: string }>;
}) {
  await requireStaff();
  const { specialistId } = await params;
  const specialist = await getSpecialist(specialistId);
  if (!specialist) notFound();
  const [services, overrides, blocks, conflicts, staff, now] = await Promise.all([
    listAllServices(),
    listOverrides(specialist.id),
    listBlocks(specialist.id),
    optionalRead("specialist conflicts", () => listConflicts(specialist.id), []),
    optionalRead("specialist staff options", listStaff, []),
    requestNow(),
  ]);
  return (
    <SpecialistDetailView
      specialist={specialist}
      services={services}
      overrides={overrides.items}
      blocks={blocks.items}
      conflicts={conflicts}
      staffOptions={staff.map((s) => ({ id: s.id, name: `${s.name} · ${s.email}` }))}
      today={toLocalIsoDate(now)}
    />
  );
}
