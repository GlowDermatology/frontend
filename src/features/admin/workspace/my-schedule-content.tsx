import { requireSpecialist } from "@/data/auth";
import { requestNow } from "@/data/now";
import { getMyAvailability, getMyConflicts, getMyProfile } from "@/data/specialist";
import { toLocalIsoDate } from "@/lib/format";
import { copyFor } from "@/lib/i18n/admin-locale";

import { shellCopy } from "../shell/copy";
import { MyScheduleView } from "./my-schedule-view";
import { specialistRead, WorkspaceUnavailable } from "./unavailable";

/**
 * `/admin/my-schedule`: the signed-in specialist's weekly hours, date overrides and blocked
 * periods (the staff detail page's cards on `specialist/…`), and the open visits the schedule
 * no longer covers.
 */
export async function MyScheduleContent() {
  const { token } = await requireSpecialist();
  const [read, now] = await Promise.all([
    specialistRead(() =>
      Promise.all([getMyProfile(token), getMyAvailability(token), getMyConflicts(token)]),
    ),
    requestNow(),
  ]);
  if (!read.ok) {
    const title = (await copyFor(shellCopy)).specialistNav["my-schedule"];
    return <WorkspaceUnavailable title={title} status={read.status} retry="/admin/my-schedule" />;
  }
  const [{ profile }, availability, conflicts] = read.data;
  return (
    <MyScheduleView
      specialist={profile}
      clinics={availability.clinics}
      overrides={availability.overrides}
      blocks={availability.blocks}
      conflicts={conflicts}
      today={toLocalIsoDate(now)}
    />
  );
}
