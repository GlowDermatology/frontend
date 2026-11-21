import { cookies } from "next/headers";
import Link from "next/link";
import type { ReactNode } from "react";

import { ToastProvider } from "@/components/ui/toast";
import { TooltipProvider } from "@/components/ui/tooltip";
import { cookieNames } from "@/data/auth/cookie-names";
import { SPECIALIST_HOME } from "@/data/auth/next-param";
import { serverEnv } from "@/lib/env.server";
import { AdminLocaleProvider } from "@/lib/i18n/admin-context";
import { getAdminLocale } from "@/lib/i18n/admin-locale";

import { HtmlLang } from "../shell/html-lang";
import { LogoutButton } from "../shell/logout-button";
import { myScheduleCopy } from "./copy";

export async function MyScheduleFrame({ children }: { children: ReactNode }) {
  const [locale, jar] = await Promise.all([getAdminLocale(), cookies()]);
  const t = myScheduleCopy[locale];
  const csrf = jar.get(cookieNames(serverEnv.cookieSecure()).csrf)?.value ?? "";
  return (
    <AdminLocaleProvider locale={locale}>
      <HtmlLang locale={locale} />
      <ToastProvider>
        <TooltipProvider>
          <div className="min-h-dvh bg-surface text-ink">
            <header className="border-b border-line bg-surface-raised">
              <nav className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-5 gap-y-2 px-4 py-3 sm:px-6">
                <Link
                  href={SPECIALIST_HOME}
                  className="mr-auto py-2 font-serif text-heading text-ink"
                >
                  {t.title}
                </Link>
                <Link
                  href="/admin/my-schedule/profile"
                  className="py-2 text-body-sm font-semibold text-ink"
                >
                  {t.myProfile}
                </Link>
                <Link href="/admin/settings" className="py-2 text-body-sm font-semibold text-ink">
                  {t.account}
                </Link>
                <LogoutButton csrf={csrf} label={t.signOut} />
              </nav>
            </header>
            <main className="mx-auto flex max-w-7xl flex-col gap-5 px-4 py-6 sm:px-6">
              {children}
            </main>
          </div>
        </TooltipProvider>
      </ToastProvider>
    </AdminLocaleProvider>
  );
}
