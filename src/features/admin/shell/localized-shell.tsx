import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { getMe } from "@/data/auth";
import { SPECIALIST_HOME } from "@/data/auth/next-param";
import { ToastProvider } from "@/components/ui/toast";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AdminLocaleProvider } from "@/lib/i18n/admin-context";
import { getAdminLocale } from "@/lib/i18n/admin-locale";

import { AdminShell } from "./admin-shell";
import { HtmlLang } from "./html-lang";

/**
 * The request-time part of the panel layout (DESIGN §G): reads the admin language from the
 * `gd_admin_language` cookie and renders the providers every admin screen relies on — the locale
 * (`useCopy`, `useFormat`), the toasts (whose own labels are localized, hence inside the locale)
 * and the shared tooltip delay — around the shell. It reads `cookies()`, so
 * `(panel)/layout.tsx` renders it inside `<Suspense fallback={<ShellSkeleton />}>`: the static
 * shell is the skeleton, everything else streams.
 */
export async function LocalizedShell({ children }: { children: ReactNode }) {
  const [locale, me] = await Promise.all([getAdminLocale(), getMe()]);
  if (me?.role === "specialist") redirect(SPECIALIST_HOME);
  return (
    <AdminLocaleProvider locale={locale}>
      <HtmlLang locale={locale} />
      <ToastProvider>
        <TooltipProvider>
          <AdminShell>{children}</AdminShell>
        </TooltipProvider>
      </ToastProvider>
    </AdminLocaleProvider>
  );
}
