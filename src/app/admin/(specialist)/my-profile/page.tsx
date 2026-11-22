import Link from "next/link";
import { Suspense } from "react";

import { isApiError } from "@/data/api/errors";
import { requireSpecialist } from "@/data/auth";
import { SPECIALIST_HOME } from "@/data/auth/next-param";
import { getMyProfile } from "@/data/specialist";
import { myScheduleCopy } from "@/features/admin/my-schedule/copy";
import { MyProfile } from "@/features/admin/my-schedule/profile";
import { PageSkeleton } from "@/features/admin/shared/skeleton";
import { pageMetadata } from "@/features/admin/shell/page-metadata";
import { copyFor } from "@/lib/i18n/admin-locale";

export function generateMetadata() {
  return pageMetadata("my-profile");
}

/** The signed-in specialist's own profile (`GET specialist/profile/`), draft or published. */
async function MyProfileContent() {
  const { token } = await requireSpecialist();
  const t = await copyFor(myScheduleCopy);
  const result = await getMyProfile(token)
    .then((profile) => ({ profile }))
    .catch((error: unknown) => {
      if (!isApiError(error)) throw error;
      return { error };
    });
  return "profile" in result ? (
    <MyProfile profile={result.profile} />
  ) : (
    <>
      <h1 className="m-0 font-serif text-display">{t.myProfile}</h1>
      <p role="status">{result.error.status === 403 ? t.paused : t.profile.unavailable}</p>
      <Link href={SPECIALIST_HOME}>{t.title}</Link>
    </>
  );
}

export default function MyProfilePage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <MyProfileContent />
    </Suspense>
  );
}
