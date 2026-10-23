import Link from "next/link";

import { dotClass } from "@/components/ui/badge";
import type { OrderListQuery } from "@/data/orders";
import { ORDER_STATUSES, type OrderStatus } from "@/domain/order";
import { cn } from "@/lib/cn";
import { formatNumber } from "@/lib/format";

import { ORDER_STATUS_META } from "../shared/status";
import { orderListHref } from "./query";

interface StatusTabsProps {
  query: OrderListQuery;
  counts: Record<OrderStatus | "all", number>;
}

/** Status filter as links (each state has its own URL); the current one is marked. */
export function StatusTabs({ query, counts }: StatusTabsProps) {
  const tabs: Array<{ status?: OrderStatus; label: string; count: number }> = [
    { label: "Hammasi", count: counts.all },
    ...ORDER_STATUSES.map((status) => ({
      status,
      label: ORDER_STATUS_META[status].label,
      count: counts[status],
    })),
  ];
  return (
    <nav aria-label="Holat bo‘yicha">
      <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
        {tabs.map((tab) => {
          const active = tab.status === query.status;
          return (
            <li key={tab.label}>
              <Link
                href={orderListHref({ ...query, status: tab.status, page: 1 })}
                scroll={false}
                aria-current={active ? "true" : undefined}
                className={cn(
                  "flex h-10 items-center gap-2 rounded-full px-3.5 text-label no-underline transition-colors duration-150",
                  active
                    ? "bg-gold text-on-gold"
                    : "border border-line-strong text-ink hover:bg-surface-raised",
                )}
              >
                {tab.status && (
                  <span
                    aria-hidden="true"
                    className={cn(
                      "size-2 rounded-full",
                      dotClass(ORDER_STATUS_META[tab.status].tone),
                    )}
                  />
                )}
                {tab.label}
                <span className="text-[12px] font-bold tabular-nums opacity-80">
                  {formatNumber(tab.count)}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
