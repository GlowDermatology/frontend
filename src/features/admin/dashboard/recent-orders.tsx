import Link from "next/link";
import type { Route } from "next";

import { Icon } from "@/components/ui/icon";
import { ScrollRegion } from "@/components/ui/scroll-region";
import type { OrderSummary } from "@/domain/order";
import { formatNumber, formatRelativeDateTime } from "@/lib/format";

import { FULFILMENT_LABEL, OrderStatusBadge } from "../shared/status";

export function RecentOrders({ orders, now }: { orders: OrderSummary[]; now: Date }) {
  return (
    <section
      aria-labelledby="recent-title"
      className="min-w-0 flex-[2_1_640px] overflow-hidden rounded-lg bg-surface-raised shadow-sm"
    >
      <div className="flex items-center justify-between gap-3 px-5 py-4">
        <h2 id="recent-title" className="m-0 text-[16px] leading-[22px] font-bold text-ink">
          So‘nggi buyurtmalar
        </h2>
        <Link
          href="/admin/orders"
          className="flex min-h-11 items-center gap-1 text-body-sm font-bold text-ink no-underline hover:underline hover:decoration-gold"
        >
          Barchasi
          <Icon name="chevron-right" size={16} />
        </Link>
      </div>
      <ScrollRegion label="So‘nggi buyurtmalar">
        <table className="data-table">
          <thead>
            <tr>
              <th scope="col">№</th>
              <th scope="col">MIJOZ</th>
              <th scope="col">SANA</th>
              <th scope="col" className="!text-right">
                SUMMA
              </th>
              <th scope="col">USUL</th>
              <th scope="col">HOLAT</th>
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
                <td>{order.customer.name}</td>
                <td className="text-ink-muted tabular-nums">
                  {formatRelativeDateTime(order.createdAt, now)}
                </td>
                <td className="text-right font-bold tabular-nums">{formatNumber(order.total)}</td>
                <td>{FULFILMENT_LABEL[order.fulfilment]}</td>
                <td>
                  <OrderStatusBadge status={order.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </ScrollRegion>
    </section>
  );
}
