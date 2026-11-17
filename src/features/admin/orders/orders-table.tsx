import Link from "next/link";
import type { Route } from "next";

import { Badge } from "@/components/ui/badge";
import { Icon } from "@/components/ui/icon";
import { ScrollRegion } from "@/components/ui/scroll-region";
import type { OrderLabels } from "@/domain/copy/orders";
import { carrierLabel, urgentIssues, type OrderSummary } from "@/domain/order";
import { cn } from "@/lib/cn";
import type { AdminFormatter } from "@/lib/format";

import { ORDER_STATUS_META, PAYMENT_STATUS_META, PROVIDER_LABEL } from "../shared/status";
import type { OrdersCopy } from "./copy";
import { customerName } from "./labels";

interface Texts {
  t: OrdersCopy;
  labels: OrderLabels;
}

function ShipmentCell({ order, t }: { order: OrderSummary } & Pick<Texts, "t">) {
  switch (order.shipment.state) {
    case "created":
      return <span className="tabular-nums">{order.shipment.trackingNumber}</span>;
    case "failed":
      if (order.shipment.pending) {
        return <span className="font-bold text-ink-muted">{t.table.sending}</span>;
      }
      return (
        <span className="inline-flex items-center gap-1.5 font-bold">
          <Icon name="alert-triangle" size={16} className="text-danger" />
          {t.table.notSent}
        </span>
      );
    case "not_required":
      return <span className="text-ink-muted">{t.table.notRequired}</span>;
    case "not_created":
      if (order.shipment.pending) {
        return <span className="font-bold text-ink-muted">{t.table.sending}</span>;
      }
      return (
        <span className="text-ink-muted" aria-label={t.table.none}>
          —
        </span>
      );
  }
}

/** Open delivery issues of the row: a red mark for an urgent one, amber otherwise. */
function IssueMark({ order, t }: { order: OrderSummary } & Pick<Texts, "t">) {
  const open = order.delivery?.openIssues.length ?? 0;
  if (open === 0) return null;
  const urgent = urgentIssues(order.delivery).length > 0;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-[12px] leading-4 font-bold",
        urgent ? "text-danger" : "text-warning",
      )}
    >
      <Icon name={urgent ? "alert-triangle" : "alert-circle"} size={14} />
      {urgent ? t.table.urgent : t.table.issues(open)}
      {urgent && <span className="sr-only">{t.table.urgentSr}</span>}
    </span>
  );
}

/**
 * The carrier and where the parcel is: "Yandex Express · Kuryer qidirilmoqda",
 * "BTS" with the BTS state (tracking number, failed hand-off), or "Kerak emas"
 * for pickup. Yandex rows never show the claim id or "Yuborilmadi".
 */
function DeliveryCell({
  order,
  t,
  labels,
  fmt,
}: { order: OrderSummary; fmt: AdminFormatter } & Texts) {
  if (order.fulfilment === "pickup") return <ShipmentCell order={order} t={t} />;
  const delivery = order.delivery;
  return (
    <span className="flex flex-col items-start gap-0.5">
      <span className="text-[12px] leading-4 font-bold text-ink-muted">
        {carrierLabel(order, fmt.locale)}
      </span>
      {delivery?.provider === "yandex" ? (
        <span>{delivery.stage ? labels.shipmentStage[delivery.stage] : "—"}</span>
      ) : (
        <ShipmentCell order={order} t={t} />
      )}
      <IssueMark order={order} t={t} />
    </span>
  );
}

interface OrdersTableProps extends Texts {
  orders: OrderSummary[];
  sortHref: Route;
  sortedAscending: boolean;
  fmt: AdminFormatter;
}

export function OrdersTable({
  orders,
  sortHref,
  sortedAscending,
  t,
  labels,
  fmt,
}: OrdersTableProps) {
  return (
    <ScrollRegion
      label={t.table.label}
      className="transition-opacity duration-150 group-data-[pending]:opacity-60"
    >
      <table className="data-table min-w-[1080px]">
        <thead>
          <tr>
            <th scope="col">{t.table.number}</th>
            <th scope="col">{t.table.customer}</th>
            <th scope="col" aria-sort={sortedAscending ? "ascending" : "descending"}>
              <Link
                href={sortHref}
                scroll={false}
                className="inline-flex items-center gap-1 text-ink no-underline hover:underline"
              >
                {t.table.date}
                <Icon name={sortedAscending ? "chevron-up" : "chevron-down"} size={14} />
                <span className="sr-only">
                  {sortedAscending ? t.table.sortAsc : t.table.sortDesc}
                </span>
              </Link>
            </th>
            <th scope="col" className="!text-right">
              {t.table.total}
            </th>
            <th scope="col">{t.table.payment}</th>
            <th scope="col">{t.table.fulfilment}</th>
            <th scope="col">{t.table.status}</th>
            <th scope="col">{t.table.delivery}</th>
            <th scope="col">
              <span className="sr-only">{t.table.actions}</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => (
            <tr key={order.id}>
              <td className="font-bold tabular-nums">{order.id}</td>
              <td>
                <span className="flex max-w-[240px] min-w-0 flex-col">
                  <span
                    className="truncate font-semibold"
                    title={customerName(order.customer.name, labels)}
                  >
                    {customerName(order.customer.name, labels)}
                  </span>
                  <span className="text-[12px] text-ink-muted tabular-nums">
                    {fmt.phone(order.customer.phone)}
                  </span>
                </span>
              </td>
              <td className="text-ink-muted tabular-nums">{fmt.dateTimeShort(order.createdAt)}</td>
              <td className="text-right font-bold tabular-nums">{fmt.number(order.total)}</td>
              <td>
                <span className="flex items-center gap-2">
                  <Badge tone={PAYMENT_STATUS_META[order.payment.status].tone}>
                    {labels.paymentStatus[order.payment.status]}
                  </Badge>
                  <span className="text-ink-muted">{PROVIDER_LABEL[order.payment.provider]}</span>
                </span>
              </td>
              <td>{labels.fulfilment[order.fulfilment]}</td>
              <td>
                <span className="flex flex-col items-start gap-1">
                  <Badge tone={ORDER_STATUS_META[order.status].tone}>
                    {labels.status[order.status]}
                  </Badge>
                  {order.cancellation && (
                    <span className="text-[12px] text-ink-muted">
                      {labels.cancellationReason[order.cancellation.reason]}
                    </span>
                  )}
                </span>
              </td>
              <td>
                <DeliveryCell order={order} t={t} labels={labels} fmt={fmt} />
              </td>
              <td>
                <Link
                  href={`/admin/orders/${order.id}` as Route}
                  aria-label={t.table.open(order.id)}
                  className="flex size-9 items-center justify-center rounded-md text-ink-muted transition-colors duration-150 hover:bg-gold-soft hover:text-ink"
                >
                  <Icon name="chevron-right" size={18} />
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </ScrollRegion>
  );
}
