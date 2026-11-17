import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { getMe, requireStaff } from "@/data/auth";
import { cookieNames } from "@/data/auth/cookie-names";
import { safeNext } from "@/data/auth/next-param";
import {
  StaffAuthFallback,
  StaffAuthFrame,
  StaffAuthHeading,
  StaffAuthSkeleton,
} from "@/features/admin/auth/staff-auth-frame";
import { ChangePasswordForm } from "@/features/admin/password/change-password-form";
import { passwordCopy } from "@/features/admin/password/copy";
import { OtherAccountForm } from "@/features/admin/password/other-account";
import { serverEnv } from "@/lib/env.server";
import { copyFor } from "@/lib/i18n/admin-locale";

export async function generateMetadata(): Promise<Metadata> {
  const t = await copyFor(passwordCopy);
  return { title: t.change.metaTitle };
}

/**
 * Request-time part: the session (without the forced-change redirect, which leads here), the
 * signed-in account and its capabilities. An account with nothing pending continues to `next`.
 */
async function ChangeGate({
  searchParams,
}: {
  searchParams: PageProps<"/admin/change-password">["searchParams"];
}) {
  const query = await searchParams;
  const next = safeNext(query.next);
  await requireStaff({ allowPasswordChangePending: true });
  const me = await getMe();
  if (!me) redirect(`/admin/login?next=${encodeURIComponent(next)}`);
  if (!me.must_change_password) redirect(next);
  const csrf = (await cookies()).get(cookieNames(serverEnv.cookieSecure()).csrf)?.value ?? "";
  return (
    <>
      <ChangePasswordForm
        next={next}
        account={{ name: me.display_name || me.email, email: me.email }}
        socialSignIn={me.auth_method === "google" || me.auth_method === "facebook"}
        emailLink={me.capabilities.staff_email_invite}
      />
      <OtherAccountForm csrf={csrf} />
    </>
  );
}

/**
 * `/admin/change-password` (DESIGN §E): the forced password change. `requireStaff()` sends every
 * panel page here while `auth/me/` says `must_change_password` (and Server Actions answered 403
 * `password_change_required` come here through `runAction`). Shared staff auth design, no
 * «Mijoz | Xodim» switch.
 */
async function ChangeScreen(props: PageProps<"/admin/change-password">) {
  const t = await copyFor(passwordCopy);
  return (
    <StaffAuthFrame switchAudience={false}>
      <StaffAuthHeading title={t.change.title} lead={t.change.lead} />
      <Suspense fallback={<StaffAuthSkeleton fields={3} />}>
        <ChangeGate searchParams={props.searchParams} />
      </Suspense>
    </StaffAuthFrame>
  );
}

export default function ChangePasswordPage(props: PageProps<"/admin/change-password">) {
  return (
    <Suspense fallback={<StaffAuthFallback fields={3} />}>
      <ChangeScreen {...props} />
    </Suspense>
  );
}
