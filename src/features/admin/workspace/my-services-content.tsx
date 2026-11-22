import { requireSpecialist } from "@/data/auth";
import { getMyProfile } from "@/data/specialist";
import { copyFor } from "@/lib/i18n/admin-locale";

import { shellCopy } from "../shell/copy";
import { MyServicesView } from "./my-services-view";
import { specialistRead, WorkspaceUnavailable } from "./unavailable";

/**
 * `/admin/my-services`: the signed-in specialist's own services with their prices and durations
 * (`specialist/services/…`), from the profile's `services` (inactive ones included).
 */
export async function MyServicesContent() {
  const { token } = await requireSpecialist();
  const read = await specialistRead(() => getMyProfile(token));
  if (!read.ok) {
    const title = (await copyFor(shellCopy)).specialistNav["my-services"];
    return <WorkspaceUnavailable title={title} status={read.status} retry="/admin/my-services" />;
  }
  return <MyServicesView services={read.data.profile.services} />;
}
