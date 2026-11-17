import Link from "next/link";
import type { Route } from "next";

import { Badge } from "@/components/ui/badge";
import { Icon } from "@/components/ui/icon";
import { ScrollRegion } from "@/components/ui/scroll-region";
import type { OrderLabels } from "@/domain/copy/orders";
import type { OrderSummary } from "@/domain/order";
import type { AdminFormatter } from "@/lib/format";

import { ORDER_STATUS_META } from "../shared/status";
import type { DashboardCopy } from "./copy";

export function RecentOrders({
  orders,
  now,
  t,
  labels,
  fmt,
}: {
  orders: OrderSummary[];
  now: Date;
  /** `dashboardCopy[locale].recent`. */
  t: DashboardCopy["recent"];
  /** `orderLabelsCopy[locale]`: status and fulfilment names. */
  labels: OrderLabels;
  fmt: AdminFormatter;
}) {
  return (
    <section
      aria-labelledby="recent-title"
      className="min-w-0 flex-[2_1_640px] overflow-hidden rounded-lg bg-surface-raised shadow-sm"
    >
      <div className="flex items-center justify-between gap-3 px-5 py-4">
        <h2 id="recent-title" className="m-0 text-[16px] leading-[22px] font-bold text-ink">
          {t.title}
        </h2>
        <Link
          href="/admin/orders"
          className="flex min-h-11 items-center gap-1 text-body-sm font-bold text-ink no-underline hover:underline hover:decoration-gold"
        >
          {t.all}
          <Icon name="chevron-right" size={16} />
        </Link>
      </div>
      {orders.length === 0 ? (
        <p className="m-0 flex items-center gap-2 border-t border-line px-5 py-8 text-body-sm text-ink-muted">
          <Icon name="receipt" size={18} className="shrink-0" />
          {t.empty}
        </p>
      ) : (
        <ScrollRegion label={t.table}>
          <table className="data-table">
            <thead>
              <tr>
                <th scope="col">{t.columns.number}</th>
                <th scope="col">{t.columns.customer}</th>
                <th scope="col">{t.columns.date}</th>
                <th scope="col" className="!text-right">
                  {t.columns.total}
                </th>
                <th scope="col">{t.columns.method}</th>
                <th scope="col">{t.columns.status}</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id}>
                  <td className="tabular-nums">
                    <Link
                      href={`/admin/orders/${order.id}` as Route}
                      className="font-bold text-ink underline hover:decoration-gold"
                    >
                      {order.id}
                    </Link>
                  </td>
                  <td className="max-w-[220px] truncate">{order.customer.name}</td>
                  <td className="text-ink-muted tabular-nums">
                    {fmt.relativeDateTime(order.createdAt, now)}
                  </td>
                  <td className="text-right font-bold tabular-nums">{fmt.number(order.total)}</td>
                  <td>{labels.fulfilment[order.fulfilment]}</td>
                  <td>
                    <Badge tone={ORDER_STATUS_META[order.status].tone}>
                      {labels.status[order.status]}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </ScrollRegion>
      )}
    </section>
  );
}
