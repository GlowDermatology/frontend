import Link from "next/link";
import { Suspense } from "react";

import { CountPill } from "@/components/ui/badge";
import { Icon } from "@/components/ui/icon";
import { getOrderStatusCounts } from "@/data/orders";
import { getPendingAppointments } from "@/data/appointments";
import { cn } from "@/lib/cn";

import { BillzStatus, BillzStatusFallback } from "./billz-status";
import { NAV_ITEMS, type AdminSection, type NavItem } from "./nav-items";
import { SidebarUser, SidebarUserFallback } from "./sidebar-user";

/** Count of work waiting for the admin; streamed so it never blocks the shell. */
async function NavCount({ kind }: { kind: NonNullable<NavItem["badge"]> }) {
  const count =
    kind === "orders"
      ? (await getOrderStatusCounts({ period: "all" })).processing
      : (await getPendingAppointments()).count;
  if (count === 0) return null;
  return (
    <>
      <CountPill>{count}</CountPill>
      <span className="sr-only">
        {kind === "orders" ? ` — ${count} ta jarayonda` : ` — ${count} ta tasdiq kutmoqda`}
      </span>
    </>
  );
}

const itemClass =
  "flex h-10 items-center gap-3 rounded-md px-3 text-label text-ink no-underline transition-colors duration-150 hover:bg-gold-soft";

export function SidebarContent({ section }: { section?: AdminSection }) {
  return (
    <div className="flex h-full flex-col gap-5 px-3 py-5">
      <div className="flex items-baseline gap-2.5 px-3 pt-1">
        <span className="font-serif text-title text-ink">Glow Derma</span>
        <span className="text-overline text-ink-muted uppercase">Admin</span>
      </div>

      <nav aria-label="Admin bo‘limlari">
        <ul className="m-0 flex list-none flex-col gap-0.5 p-0">
          {NAV_ITEMS.map((item) => {
            const active = item.section === section;
            return (
              <li key={item.section}>
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(itemClass, active ? "bg-gold-soft font-bold" : "font-semibold")}
                >
                  <Icon
                    name={item.icon}
                    size={20}
                    className={cn("shrink-0", active ? "text-gold-ink" : "text-ink-muted")}
                  />
                  <span className="flex-1">{item.label}</span>
                  {item.badge && (
                    <Suspense fallback={null}>
                      <NavCount kind={item.badge} />
                    </Suspense>
                  )}
                </Link>
              </li>
            );
          })}
          <li>
            <span
              aria-disabled="true"
              className="flex h-10 items-center gap-3 rounded-md px-3 text-label text-ink-muted"
            >
              <Icon name="sparkles" size={20} className="shrink-0" />
              <span className="flex-1">AI tahlil</span>
              <span className="rounded-sm border border-line-strong px-1.5 py-0.5 text-[10px] leading-[14px] font-bold tracking-[0.06em]">
                2-BOSQICH
              </span>
            </span>
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
