import Link from "next/link";
import { Suspense, type ReactNode } from "react";

import { Icon } from "@/components/ui/icon";

import { DemoBadge } from "./demo-badge";
import { GlobalSearch } from "./global-search";
import { MobileNav } from "./mobile-nav";
import type { AdminSection } from "./nav-items";
import { SidebarContent } from "./sidebar";

interface AdminShellProps {
  /** Highlighted nav item; omitted on pages outside the menu (e.g. 404). */
  section?: AdminSection;
  children: ReactNode;
}

/**
 * Sidebar + top bar + page content. Rendered by each page with its section so
 * the active item is part of the static HTML (no client-side path lookup).
 */
export function AdminShell({ section, children }: AdminShellProps) {
  return (
    <div className="flex min-h-dvh bg-surface text-ink">
      <a
        href="#admin-main"
        className="sr-only z-50 rounded-md bg-ink px-4 py-3 text-label text-surface focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Asosiy kontentga o‘tish
      </a>
      <aside className="sticky top-0 hidden h-dvh w-[248px] shrink-0 overflow-y-auto border-r border-line bg-surface-raised lg:block">
        <SidebarContent section={section} />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex flex-wrap items-center gap-3 border-b border-line bg-surface px-4 py-3.5 sm:px-6">
          <MobileNav>
            <SidebarContent section={section} />
          </MobileNav>
          <GlobalSearch />
          <span className="flex-1" />
          <Suspense fallback={null}>
            <DemoBadge />
          </Suspense>
          <Link
            href="/admin/notifications"
            aria-label="Bildirishnomalar"
            className="relative flex size-11 items-center justify-center rounded-md border border-line bg-surface-raised text-ink transition-colors duration-150 hover:bg-surface"
          >
            <Icon name="bell" size={20} />
            <span
              aria-hidden="true"
              className="absolute top-2.5 right-2.5 size-2 rounded-full bg-danger"
            />
          </Link>
        </header>

        <main
          id="admin-main"
          tabIndex={-1}
          className="flex w-full max-w-[1280px] flex-1 flex-col gap-6 p-4 focus:outline-none sm:p-6"
        >
          {children}
        </main>
      </div>
    </div>
  );
}
