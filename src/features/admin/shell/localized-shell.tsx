import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { getMe } from "@/data/auth";
import { workspaceRedirect, type Workspace } from "@/data/auth/next-param";
import { ToastProvider } from "@/components/ui/toast";
import { TooltipProvider } from "@/components/ui/tooltip";
import type { Locale } from "@/lib/i18n/locales";
import { AdminLocaleProvider } from "@/lib/i18n/admin-context";
import { getAdminLocale } from "@/lib/i18n/admin-locale";

import { AdminShell } from "./admin-shell";
import { HtmlLang } from "./html-lang";

/**
 * The providers every admin screen relies on — the locale (`useCopy`, `useFormat`), the toasts
 * (whose own labels are localized, hence inside the locale) and the shared tooltip delay.
 */
export function AdminProviders({ locale, children }: { locale: Locale; children: ReactNode }) {
  return (
    <AdminLocaleProvider locale={locale}>
      <HtmlLang locale={locale} />
      <ToastProvider>
        <TooltipProvider>{children}</TooltipProvider>
      </ToastProvider>
    </AdminLocaleProvider>
  );
}

/**
 * The request-time part of a workspace layout (DESIGN §G): reads the admin language from the
 * `gd_admin_language` cookie and renders `AdminProviders` around the workspace's shell. It reads
 * `cookies()`, so `(panel)/layout.tsx` and `(specialist)/layout.tsx` render it inside
 * `<Suspense fallback={<ShellSkeleton workspace=… />}>`: the static shell is the skeleton,
 * everything else streams.
 *
 * It is also the role boundary between the workspaces (`workspaceRedirect`): a specialist never
 * sees the admin shell and staff never see the specialist one. A missing session is left to the
 * page's own data boundary, which redirects to sign-in with the right `next`.
 */
export async function LocalizedShell({
  workspace,
  children,
}: {
  workspace: Workspace;
  children: ReactNode;
}) {
  const [locale, me] = await Promise.all([getAdminLocale(), getMe()]);
  const elsewhere = workspaceRedirect(workspace, me?.role);
  if (elsewhere) redirect(elsewhere);
  return (
    <AdminProviders locale={locale}>
      <AdminShell workspace={workspace}>{children}</AdminShell>
    </AdminProviders>
  );
}
