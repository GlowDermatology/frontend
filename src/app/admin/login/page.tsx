import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { getMe, verifyStaff } from "@/data/auth";
import { cookieNames } from "@/data/auth/cookie-names";
import { safeNext, staffDestination } from "@/data/auth/next-param";
import { OAUTH_PROVIDER_LABEL } from "@/data/auth/oauth";
import { oauthConfig, requestNotice } from "@/data/auth/oauth-env";
import { mockMfaState } from "@/data/mfa";
import { storefrontEnabled } from "@/data/shop/mode";
import { staffAuthCopy } from "@/features/admin/auth/copy";
import { LoginForm } from "@/features/admin/auth/login-form";
import {
  StaffAuthCard,
  StaffAuthCardSkeleton,
  StaffAuthFrame,
  StaffAuthHeading,
  StaffAuthSkeleton,
} from "@/features/admin/auth/staff-auth-frame";
import { serverEnv } from "@/lib/env.server";
import { copyFor } from "@/lib/i18n/admin-locale";

export async function generateMetadata(): Promise<Metadata> {
  const t = await copyFor(staffAuthCopy);
  return { title: t.meta.title };
}

/**
 * Request-time part: reads `next`, bounces a browser that already has a valid
 * session, and hands the current csrf cookie, the enabled social sign-in
 * providers (`GLOWDERMA_OAUTH_PROVIDERS`) and a failed social sign-in's
 * signed `?oauth=` notice (the backend's message) to the form, and the
 * localized `?notice=password_set` after an e-mailed link set the password, or
 * `?notice=mfa_expired` after the MFA step ended (DESIGN §E).
 */
async function LoginGate({
  searchParams,
}: {
  searchParams: PageProps<"/admin/login">["searchParams"];
}) {
  const query = await searchParams;
  const next = safeNext(query.next);
  const session = await verifyStaff();
  // Mock mode has no sessions (the admin is open); with the demo's MFA on the form stays, so the
  // sign-in's second step can be previewed (`GLOWDERMA_MOCK_MFA`, DESIGN §E).
  if (session.ok && !(session.mode === "mock" && (await mockMfaState()).enabled)) {
    const me = await getMe();
    if (session.mode === "mock" || me) redirect(staffDestination(me?.role, next));
  }
  const csrf = (await cookies()).get(cookieNames(serverEnv.cookieSecure()).csrf)?.value ?? "";
  const notice = await requestNotice(query.oauth);
  const config = oauthConfig();
  const t = await copyFor(staffAuthCopy);
  const providers = config.providers.map((id) => ({
    id,
    label: OAUTH_PROVIDER_LABEL[id],
    href: `/admin/auth/oauth/${id}/start?next=${encodeURIComponent(next)}`,
  }));
  return (
    <LoginForm
      next={next}
      csrf={csrf}
      providers={providers}
      providersAreFake={config.mode === "fake"}
      notice={
        notice?.kind === "error"
          ? notice.message
          : query.notice === "mfa_expired"
            ? t.notices.mfaExpired
            : null
      }
      success={query.notice === "password_set" ? t.notices.passwordSet : null}
    />
  );
}

/**
 * `/admin/login` in the shared sign-in design (DESIGN §F): the still life, the staff card with the
 * brand and the small language switch, «Mijoz | Xodim» (the customer link only while the
 * storefront is served), the heading, then the form once the session check is done.
 */
async function LoginScreen({ searchParams }: PageProps<"/admin/login">) {
  const [t, withCustomer] = await Promise.all([copyFor(staffAuthCopy), storefrontEnabled()]);
  return (
    <StaffAuthCard withCustomerLink={withCustomer}>
      <StaffAuthHeading title={t.form.title} lead={t.form.lead} />
      <Suspense fallback={<StaffAuthSkeleton fields={2} />}>
        <LoginGate searchParams={searchParams} />
      </Suspense>
    </StaffAuthCard>
  );
}

/** One static frame; only the caption and the card's content stream in (no remount). */
export default function LoginPage(props: PageProps<"/admin/login">) {
  return (
    <StaffAuthFrame>
      <Suspense fallback={<StaffAuthCardSkeleton fields={2} audienceSwitch />}>
        <LoginScreen {...props} />
      </Suspense>
    </StaffAuthFrame>
  );
}
