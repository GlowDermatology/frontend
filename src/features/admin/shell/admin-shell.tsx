import { Suspense, type ReactNode } from "react";

import type { Workspace } from "@/data/auth/next-param";
import { copyFor } from "@/lib/i18n/admin-locale";

import { ContentErrorBoundary } from "./content-error";
import { shellCopy } from "./copy";
import { DemoBadge } from "./demo-badge";
import { GlobalSearch } from "./global-search";
import { IssuesAlert, IssuesAlertFallback } from "./issues-alert";
import { MobileNav } from "./mobile-nav";
import { SidebarContent } from "./sidebar";
import { HeaderProfile, HeaderProfileFallback } from "./header-profile";

/**
 * Sidebar + top bar + page content, rendered once by the workspace layout (`(panel)/layout.tsx`
 * or `(specialist)/layout.tsx`, inside `LocalizedShell`, behind the layout's `<Suspense>`), so it
 * persists across navigations. The active nav item is derived on the client from the URL
 * (`NavLink`). The page content sits inside `ContentErrorBoundary`, so a failing board shows an
 * error card with retry while the navigation stays usable.
 *
 * The specialist workspace keeps the frame and drops what belongs to the admin panel: the global
 * search, the demo badge and the delivery issues alert (so its 30 s poll never mounts).
 */
export async function AdminShell({
  workspace,
  children,
}: {
  workspace: Workspace;
  children: ReactNode;
}) {
  const t = await copyFor(shellCopy);
  const admin = workspace === "admin";
  return (
    <div className="flex min-h-dvh bg-surface text-ink">
      <a
        href="#admin-main"
        className="sr-only z-50 rounded-md bg-ink px-4 py-3 text-label text-surface focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        {t.skipToContent}
      </a>
      <aside className="sticky top-0 hidden h-dvh w-[248px] shrink-0 overflow-y-auto border-r border-line bg-surface-raised lg:block">
        <SidebarContent workspace={workspace} />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex flex-wrap items-center gap-3 border-b border-line bg-surface px-4 py-3.5 sm:px-6">
          <MobileNav label={admin ? t.sections : t.specialistSections}>
            <SidebarContent workspace={workspace} />
          </MobileNav>
          {admin && <GlobalSearch />}
          <span className="flex-1" />
          {admin && (
            <>
              <Suspense fallback={null}>
                <DemoBadge />
              </Suspense>
              <Suspense fallback={<IssuesAlertFallback />}>
                <IssuesAlert />
              </Suspense>
            </>
          )}
          <Suspense fallback={<HeaderProfileFallback />}>
            <HeaderProfile workspace={workspace} />
          </Suspense>
        </header>

        <main
          id="admin-main"
          tabIndex={-1}
          className="flex w-full max-w-[1280px] flex-1 flex-col gap-6 p-4 focus:outline-none sm:p-6"
        >
          <ContentErrorBoundary>{children}</ContentErrorBoundary>
        </main>
      </div>
    </div>
  );
}
