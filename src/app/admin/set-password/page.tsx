import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Suspense } from "react";

import { cookieNames } from "@/data/auth/cookie-names";
import { checkPasswordLink } from "@/data/password";
import {
  StaffAuthFallback,
  StaffAuthFrame,
  StaffAuthHeading,
  StaffAuthSkeleton,
} from "@/features/admin/auth/staff-auth-frame";
import { passwordCopy } from "@/features/admin/password/copy";
import { LinkAccount, LinkProblem } from "@/features/admin/password/link-states";
import { SetPasswordForm } from "@/features/admin/password/set-password-form";
import { serverEnv } from "@/lib/env.server";
import { copyFor, getFormat } from "@/lib/i18n/admin-locale";

export async function generateMetadata(): Promise<Metadata> {
  const t = await copyFor(passwordCopy);
  return { title: t.set.metaTitle, referrer: "no-referrer" };
}

/**
 * Request-time part: the link the proxy stored (HttpOnly cookie) is checked server-side
 * (`auth/password-token/check/`) before anything is shown; the token itself never reaches the
 * browser. A good link shows whose account it is and the form; a missing, used, revoked or
 * expired one (one uniform answer) says what to do.
 */
async function SetPasswordGate() {
  const [t, fmt, check, store] = await Promise.all([
    copyFor(passwordCopy),
    getFormat(),
    checkPasswordLink(),
    cookies(),
  ]);
  if (!check.ok) return <LinkProblem reason={check.reason} />;
  const { info } = check;
  const csrf = store.get(cookieNames(serverEnv.cookieSecure()).csrf)?.value ?? "";
  return (
    <>
      <StaffAuthHeading
        title={info.purpose === "invite" ? t.set.inviteTitle(info.fullName) : t.set.resetTitle}
        lead={info.purpose === "invite" ? t.set.inviteLead : t.set.resetLead}
      />
      <LinkAccount
        label={t.set.account}
        email={info.emailMasked}
        note={t.set.validUntil(fmt.dateTimeShort(info.expiresAt))}
      />
      <SetPasswordForm csrf={csrf} email={info.emailMasked} />
    </>
  );
}

/**
 * `/admin/set-password` (DESIGN §E): the public page of the e-mailed invite / reset link
 * (`{ADMIN_PANEL_URL}/set-password?token=…`). The proxy moves the token into a cookie and reloads
 * the bare address (so it is not in the history), the page is served with `Referrer-Policy:
 * no-referrer`, and no session is needed or opened: the person signs in afterwards.
 */
export default function SetPasswordPage() {
  return (
    <Suspense fallback={<StaffAuthFallback />}>
      <StaffAuthFrame switchAudience={false}>
        <Suspense fallback={<StaffAuthSkeleton fields={2} />}>
          <SetPasswordGate />
        </Suspense>
      </StaffAuthFrame>
    </Suspense>
  );
}
