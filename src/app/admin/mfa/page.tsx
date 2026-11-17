import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { verifyStaff } from "@/data/auth";
import { cookieNames } from "@/data/auth/cookie-names";
import { pendingMfaStep } from "@/data/mfa";
import { mfaStepCopy } from "@/features/admin/auth/mfa-copy";
import { MfaStepForm } from "@/features/admin/auth/mfa-step-form";
import {
  StaffAuthFallback,
  StaffAuthFrame,
  StaffAuthHeading,
  StaffAuthSkeleton,
} from "@/features/admin/auth/staff-auth-frame";
import { serverEnv } from "@/lib/env.server";
import { copyFor } from "@/lib/i18n/admin-locale";

export async function generateMetadata(): Promise<Metadata> {
  const t = await copyFor(mfaStepCopy);
  return { title: t.meta.title, referrer: "no-referrer", robots: { index: false } };
}

/**
 * Request-time part: the pending step from its HttpOnly cookie (`Path=/admin/mfa`). Only the
 * expiry (for the countdown) and the validated `next` reach the form; the challenge stays in the
 * cookie for the Server Action. No pending step (expired, used, opened directly) → the sign-in
 * page; a browser that already has a session continues to `next`.
 */
async function MfaGate() {
  const step = await pendingMfaStep();
  const session = await verifyStaff();
  const mock = session.ok && session.mode === "mock";
  if (session.ok && !mock) redirect(step?.pending.next ?? "/admin");
  if (!step) redirect("/admin/login");
  const csrf = (await cookies()).get(cookieNames(serverEnv.cookieSecure()).csrf)?.value ?? "";
  return (
    <MfaStepForm csrf={csrf} secondsLeft={step.secondsLeft} next={step.pending.next} demo={mock} />
  );
}

/**
 * `/admin/mfa` — the sign-in's second step (DESIGN §E "MFA") in the shared staff auth design,
 * without the «Mijoz | Xodim» switch. Public: the proxy lets it through without a session and
 * serves it with `Referrer-Policy: no-referrer`.
 */
async function MfaScreen() {
  const t = await copyFor(mfaStepCopy);
  return (
    <StaffAuthFrame switchAudience={false}>
      <StaffAuthHeading title={t.title} />
      <Suspense fallback={<StaffAuthSkeleton fields={1} />}>
        <MfaGate />
      </Suspense>
    </StaffAuthFrame>
  );
}

export default function MfaPage() {
  return (
    <Suspense fallback={<StaffAuthFallback fields={1} />}>
      <MfaScreen />
    </Suspense>
  );
}
