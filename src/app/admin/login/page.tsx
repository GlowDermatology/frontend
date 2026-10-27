import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Suspense, type ReactNode } from "react";

import { Card } from "@/components/ui/card";
import { verifyStaff } from "@/data/auth";
import { cookieNames } from "@/data/auth/cookie-names";
import { safeNext } from "@/data/auth/next-param";
import { OAUTH_PROVIDER_LABEL } from "@/data/auth/oauth";
import { oauthConfig, requestNotice } from "@/data/auth/oauth-env";
import { LoginForm } from "@/features/admin/auth/login-form";
import { Skeleton } from "@/features/admin/shared/skeleton";
import { serverEnv } from "@/lib/env.server";

export const metadata: Metadata = { title: "Kirish" };

/** Centered card without the admin shell; the brand block matches the sidebar. */
function LoginCard({ children }: { children: ReactNode }) {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-surface p-4 text-ink">
      <Card className="flex w-full max-w-[400px] flex-col gap-6 p-6 sm:p-8">
        <div className="flex flex-col gap-1">
          <div className="flex items-baseline gap-2.5">
            <span className="font-serif text-title text-ink">Glow Derma</span>
            <span className="text-overline text-ink-muted uppercase">Admin</span>
          </div>
          <h1 className="m-0 text-[16px] leading-[22px] font-bold text-ink">Tizimga kirish</h1>
        </div>
        {children}
      </Card>
    </main>
  );
}

function LoginFallback() {
  return (
    <div role="status" aria-live="polite" className="flex flex-col gap-5">
      <span className="sr-only">Yuklanmoqda…</span>
      <div className="flex flex-col gap-2">
        <Skeleton className="h-4 w-16 rounded-sm" />
        <Skeleton className="h-11 rounded-md" />
      </div>
      <div className="flex flex-col gap-2">
        <Skeleton className="h-4 w-16 rounded-sm" />
        <Skeleton className="h-11 rounded-md" />
      </div>
      <Skeleton className="h-[52px] rounded-md" />
    </div>
  );
}

/**
 * Request-time part: reads `next`, bounces a browser that already has a valid
 * session, and hands the current csrf cookie, the enabled social sign-in
 * providers (`GLOWDERMA_OAUTH_PROVIDERS`) and a failed social sign-in's
 * signed `?oauth=` notice (the backend's message) to the form.
 */
async function LoginGate({
  searchParams,
}: {
  searchParams: PageProps<"/admin/login">["searchParams"];
}) {
  const query = await searchParams;
  const next = safeNext(query.next);
  const session = await verifyStaff();
  if (session.ok) redirect(next);
  const csrf = (await cookies()).get(cookieNames(serverEnv.cookieSecure()).csrf)?.value ?? "";
  const notice = await requestNotice(query.oauth);
  const config = oauthConfig();
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
      notice={notice?.kind === "error" ? notice.message : null}
    />
  );
}

export default function LoginPage({ searchParams }: PageProps<"/admin/login">) {
  return (
    <LoginCard>
      <Suspense fallback={<LoginFallback />}>
        <LoginGate searchParams={searchParams} />
      </Suspense>
    </LoginCard>
  );
}
