import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Suspense, type ReactNode } from "react";

import { Card } from "@/components/ui/card";
import { verifyStaff } from "@/data/auth";
import { cookieNames } from "@/data/auth/cookie-names";
import { safeNext } from "@/data/auth/next-param";
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
 * session, and hands the current csrf cookie to the form.
 */
async function LoginGate({
  searchParams,
}: {
  searchParams: PageProps<"/admin/login">["searchParams"];
}) {
  const next = safeNext((await searchParams).next);
  const session = await verifyStaff();
  if (session.ok) redirect(next);
  const csrf = (await cookies()).get(cookieNames(serverEnv.cookieSecure()).csrf)?.value ?? "";
  return <LoginForm next={next} csrf={csrf} />;
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
