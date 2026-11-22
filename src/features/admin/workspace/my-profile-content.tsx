import { requireSpecialist } from "@/data/auth";
import { getMyProfile } from "@/data/specialist";
import { copyFor } from "@/lib/i18n/admin-locale";

import { shellCopy } from "../shell/copy";
import { MyProfileView } from "./my-profile-view";
import { specialistRead, WorkspaceUnavailable } from "./unavailable";

/**
 * `/admin/my-profile`: the signed-in specialist's whole public profile and photo, the publish
 * checklist, and publishing or unpublishing (`specialist/profile/`). Clinics are listed only:
 * staff assign them.
 */
export async function MyProfileContent() {
  const { token } = await requireSpecialist();
  const read = await specialistRead(() => getMyProfile(token));
  if (!read.ok) {
    const title = (await copyFor(shellCopy)).specialistNav["my-profile"];
    return <WorkspaceUnavailable title={title} status={read.status} retry="/admin/my-profile" />;
  }
  return <MyProfileView specialist={read.data.profile} clinics={read.data.clinics} />;
}
