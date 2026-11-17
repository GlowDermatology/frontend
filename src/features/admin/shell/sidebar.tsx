import { Suspense, type ReactNode } from "react";

import { CountPill } from "@/components/ui/badge";
import { DisabledReasonButton } from "@/components/ui/disabled-reason";
import { Icon } from "@/components/ui/icon";
import { getMe } from "@/data/auth";
import { getNavCounts } from "@/data/shell";
import { copyFor } from "@/lib/i18n/admin-locale";

import { BillzStatus, BillzStatusFallback } from "./billz-status";
import { shellCopy } from "./copy";
import { IssuesNavPill } from "./issues-badge";
import { NavLink } from "./nav-link";
import { NAV_ITEMS, type NavItem } from "./nav-items";
import { SidebarUser, SidebarUserFallback } from "./sidebar-user";

/**
 * Count of work waiting for the admin (`nav-counts/`, one call per request);
 * streamed inside `<Suspense>` so it never blocks the shell. The pill sits at
 * the end of a fixed-height row whose label already takes the free width, so
 * its arrival does not shift the layout.
 */
async function NavCount({ kind }: { kind: NonNullable<NavItem["badge"]> }) {
  const counts = await getNavCounts();
  // Delivery issues follow the shell's 30 s poll (a client island).
  if (kind === "issues") return <IssuesNavPill initial={counts?.deliveryIssuesOpen ?? null} />;
  const count = counts
    ? kind === "orders"
      ? counts.ordersProcessing
      : counts.appointmentsPending
    : 0;
  if (count === 0) return null;
  const t = await copyFor(shellCopy);
  return (
    <>
      <CountPill>{count}</CountPill>
      <span className="sr-only">{t.navCount[kind](count)}</span>
    </>
  );
}

/**
 * A manager-only item (Xodimlar, contract §2.16): streamed after `auth/me/`
 * answers, rendered only when the caller may manage staff.
 */
async function ManagerOnly({ children }: { children: ReactNode }) {
  const me = await getMe();
  if (!me || !(me.is_manager || me.is_superuser)) return null;
  return <>{children}</>;
}

/**
 * The sidebar (desktop aside and mobile drawer). The active item is a client concern
 * (`NavLink`, from the URL segments below the panel layout), so this tree is the same on every
 * page and the shell is rendered once by `(panel)/layout.tsx`.
 */
export async function SidebarContent() {
  const t = await copyFor(shellCopy);
  return (
    <div className="flex h-full flex-col gap-5 px-3 py-5">
      <div className="flex items-baseline gap-2.5 px-3 pt-1">
        <span className="font-serif text-title text-ink">Glow Derma</span>
        <span className="text-overline text-ink-muted uppercase">Admin</span>
      </div>

      <nav aria-label={t.sections}>
        <ul className="m-0 flex list-none flex-col gap-0.5 p-0">
          {NAV_ITEMS.map((item) => {
            const entry = (
              <li key={item.section}>
                <NavLink section={item.section} href={item.href}>
                  <Icon
                    name={item.icon}
                    size={20}
                    className="shrink-0 text-ink-muted group-aria-[current=page]:text-gold-ink"
                  />
                  <span className="flex-1">{t.nav[item.section]}</span>
                  {item.badge && (
                    <Suspense fallback={null}>
                      <NavCount kind={item.badge} />
                    </Suspense>
                  )}
                </NavLink>
              </li>
            );
            return item.managerOnly ? (
              <Suspense key={item.section} fallback={null}>
                <ManagerOnly>{entry}</ManagerOnly>
              </Suspense>
            ) : (
              entry
            );
          })}
          <li>
            {/* Not built yet: focusable, so keyboard and screen-reader users get the reason
                (described by it, tooltip on focus, hover and tap) like any disabled control. */}
            <DisabledReasonButton
              reason={t.ai.reason}
              className="flex h-10 w-full cursor-not-allowed items-center gap-2.5 rounded-md px-3 text-left text-label text-ink-muted"
            >
              <Icon name="sparkles" size={20} className="shrink-0" />
              {/* One line in every language («AI-аналитика» used to break at its hyphen). */}
              <span className="min-w-0 flex-1 truncate whitespace-nowrap">{t.ai.label}</span>
              <span className="shrink-0 rounded-sm border border-line-strong px-1.5 py-0.5 text-[10px] leading-[14px] font-bold tracking-[0.06em] whitespace-nowrap">
                {t.ai.badge}
              </span>
            </DisabledReasonButton>
          </li>
        </ul>
      </nav>

      <div className="mt-auto flex flex-col gap-3">
        <Suspense fallback={<BillzStatusFallback />}>
          <BillzStatus />
        </Suspense>
        <Suspense fallback={<SidebarUserFallback />}>
          <SidebarUser />
        </Suspense>
      </div>
    </div>
  );
}
