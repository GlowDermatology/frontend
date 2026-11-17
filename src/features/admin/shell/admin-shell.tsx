import Link from "next/link";
import { Suspense, type ReactNode } from "react";

import { Icon } from "@/components/ui/icon";
import { copyFor } from "@/lib/i18n/admin-locale";

import { ContentErrorBoundary } from "./content-error";
import { shellCopy } from "./copy";
import { DemoBadge } from "./demo-badge";
import { GlobalSearch } from "./global-search";
import { IssuesAlert, IssuesAlertFallback } from "./issues-alert";
import { MobileNav } from "./mobile-nav";
import { SidebarContent } from "./sidebar";

/**
 * Sidebar + top bar + page content, rendered once by `src/app/admin/(panel)/layout.tsx` (inside
 * `LocalizedShell`, behind the layout's `<Suspense>`), so it persists across navigations. The
 * active nav item is derived on the client from the URL (`NavLink`). The page content sits inside
 * `ContentErrorBoundary`, so a failing board shows an error card with retry while the navigation
 * stays usable.
 */
export async function AdminShell({ children }: { children: ReactNode }) {
  const t = await copyFor(shellCopy);
  return (
    <div className="flex min-h-dvh bg-surface text-ink">
      <a
        href="#admin-main"
        className="sr-only z-50 rounded-md bg-ink px-4 py-3 text-label text-surface focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        {t.skipToContent}
      </a>
      <aside className="sticky top-0 hidden h-dvh w-[248px] shrink-0 overflow-y-auto border-r border-line bg-surface-raised lg:block">
        <SidebarContent />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex flex-wrap items-center gap-3 border-b border-line bg-surface px-4 py-3.5 sm:px-6">
          <MobileNav>
            <SidebarContent />
          </MobileNav>
          <GlobalSearch />
          <span className="flex-1" />
          <Suspense fallback={null}>
            <DemoBadge />
          </Suspense>
          <Suspense fallback={<IssuesAlertFallback />}>
            <IssuesAlert />
          </Suspense>
          <Link
            href="/admin/notifications"
            aria-label={t.notifications}
            className="relative flex size-11 items-center justify-center rounded-md border border-line bg-surface-raised text-ink transition-colors duration-150 hover:bg-surface"
          >
            <Icon name="bell" size={20} />
          </Link>
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
