import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { isApiError } from "@/data/api/errors";
import { getMe, requireStaff } from "@/data/auth";
import { SPECIALIST_HOME } from "@/data/auth/next-param";
import { getMyProfile } from "@/data/specialist";
import { myScheduleCopy } from "@/features/admin/my-schedule/copy";
import { MyScheduleFrame } from "@/features/admin/my-schedule/frame";
import { MyProfile } from "@/features/admin/my-schedule/profile";
import { PageSkeleton } from "@/features/admin/shared/skeleton";
import { copyFor } from "@/lib/i18n/admin-locale";

/**
 * My Schedule → My profile: the signed-in specialist's own profile (`GET specialist/profile/`),
 * draft or published. Any other account goes back to the admin workspace.
 */
async function MyProfileContent() {
  const session = await requireStaff();
  const [me, t] = await Promise.all([getMe(), copyFor(myScheduleCopy)]);
  if (session.mode !== "api" || (me && me.role !== "specialist")) redirect("/admin");
  const result = await getMyProfile(session.token)
    .then((profile) => ({ profile }))
    .catch((error: unknown) => {
      if (!isApiError(error)) throw error;
      return { error };
    });
  return (
    <MyScheduleFrame>
      {"profile" in result ? (
        <MyProfile profile={result.profile} />
      ) : (
        <>
          <h1 className="m-0 font-serif text-display">{t.myProfile}</h1>
          <p role="status">{result.error.status === 403 ? t.paused : t.profile.unavailable}</p>
          <Link href={SPECIALIST_HOME}>{t.title}</Link>
        </>
      )}
    </MyScheduleFrame>
  );
}

export default function MyProfilePage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <MyProfileContent />
    </Suspense>
  );
}
