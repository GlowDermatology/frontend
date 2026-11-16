import Link from "next/link";
import type { Route } from "next";

import { Icon } from "@/components/ui/icon";
import { ScrollRegion } from "@/components/ui/scroll-region";
import {
  carrierLabel,
  SHIPMENT_STAGE_LABEL,
  urgentIssues,
  type OrderSummary,
} from "@/domain/order";
import { cn } from "@/lib/cn";
import { formatDateTimeShort, formatNumber, formatPhone } from "@/lib/format";

import {
  FULFILMENT_LABEL,
  OrderStatusBadge,
  PaymentStatusBadge,
  PROVIDER_LABEL,
} from "../shared/status";

const CANCEL_LABEL = {
  reservation_expired: "Band muddati tugadi",
  admin: "Admin bekor qildi",
  customer_request: "Mijoz bekor qildi",
} as const;

function ShipmentCell({ order }: { order: OrderSummary }) {
  switch (order.shipment.state) {
    case "created":
      return <span className="tabular-nums">{order.shipment.trackingNumber}</span>;
    case "failed":
      if (order.shipment.pending) {
        return <span className="font-bold text-ink-muted">Yuborilmoqda…</span>;
      }
      return (
        <span className="inline-flex items-center gap-1.5 font-bold">
          <Icon name="alert-triangle" size={16} className="text-danger" />
          Yuborilmadi
        </span>
      );
    case "not_required":
      return <span className="text-ink-muted">Kerak emas</span>;
    case "not_created":
      if (order.shipment.pending) {
        return <span className="font-bold text-ink-muted">Yuborilmoqda…</span>;
      }
      return (
        <span className="text-ink-muted" aria-label="Yo‘q">
          —
        </span>
      );
  }
}

/** Open delivery issues of the row: a red mark for an urgent one, amber otherwise. */
function IssueMark({ order }: { order: OrderSummary }) {
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
      {urgent ? "Shoshilinch" : `${open} ta muammo`}
      {urgent && <span className="sr-only"> muammo</span>}
    </span>
  );
}

/**
 * The carrier and where the parcel is: "Yandex Express · Kuryer qidirilmoqda",
 * "BTS" with the BTS state (tracking number, failed hand-off), or "Kerak emas"
 * for pickup. Yandex rows never show the claim id or "Yuborilmadi".
 */
function DeliveryCell({ order }: { order: OrderSummary }) {
  if (order.fulfilment === "pickup") return <ShipmentCell order={order} />;
  const delivery = order.delivery;
  return (
    <span className="flex flex-col items-start gap-0.5">
      <span className="text-[12px] leading-4 font-bold text-ink-muted">{carrierLabel(order)}</span>
      {delivery?.provider === "yandex" ? (
        <span>{delivery.stage ? SHIPMENT_STAGE_LABEL[delivery.stage] : "—"}</span>
      ) : (
        <ShipmentCell order={order} />
      )}
      <IssueMark order={order} />
    </span>
  );
}

interface OrdersTableProps {
  orders: OrderSummary[];
  sortHref: Route;
  sortedAscending: boolean;
}

export function OrdersTable({ orders, sortHref, sortedAscending }: OrdersTableProps) {
  return (
    <ScrollRegion
      label="Buyurtmalar jadvali"
      className="transition-opacity duration-150 group-data-[pending]:opacity-60"
    >
      <table className="data-table min-w-[1080px]">
        <thead>
          <tr>
            <th scope="col">№</th>
            <th scope="col">MIJOZ</th>
            <th scope="col" aria-sort={sortedAscending ? "ascending" : "descending"}>
              <Link
                href={sortHref}
                scroll={false}
                className="inline-flex items-center gap-1 text-ink no-underline hover:underline"
              >
                SANA
                <Icon name={sortedAscending ? "chevron-up" : "chevron-down"} size={14} />
                <span className="sr-only">
                  {sortedAscending ? ", eskisi birinchi" : ", yangisi birinchi"} — tartibni
                  almashtirish
                </span>
              </Link>
            </th>
            <th scope="col" className="!text-right">
              SUMMA, SO‘M
            </th>
            <th scope="col">TO‘LOV</th>
            <th scope="col">OLISH USULI</th>
            <th scope="col">HOLAT</th>
            <th scope="col">YETKAZISH</th>
            <th scope="col">
              <span className="sr-only">Amallar</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => (
            <tr key={order.id}>
              <td className="font-bold tabular-nums">{order.id}</td>
              <td>
                <span className="flex flex-col">
                  <span className="font-semibold">{order.customer.name}</span>
                  <span className="text-[12px] text-ink-muted tabular-nums">
                    {formatPhone(order.customer.phone)}
                  </span>
                </span>
              </td>
              <td className="text-ink-muted tabular-nums">
                {formatDateTimeShort(order.createdAt)}
              </td>
              <td className="text-right font-bold tabular-nums">{formatNumber(order.total)}</td>
              <td>
                <span className="flex items-center gap-2">
                  <PaymentStatusBadge status={order.payment.status} />
                  <span className="text-ink-muted">{PROVIDER_LABEL[order.payment.provider]}</span>
                </span>
              </td>
              <td>{FULFILMENT_LABEL[order.fulfilment]}</td>
              <td>
                {order.cancellation ? (
                  <span className="flex flex-col items-start gap-1">
                    <OrderStatusBadge status={order.status} />
                    <span className="text-[12px] text-ink-muted">
                      {CANCEL_LABEL[order.cancellation.reason]}
                    </span>
                  </span>
                ) : (
                  <OrderStatusBadge status={order.status} />
                )}
              </td>
              <td>
                <DeliveryCell order={order} />
              </td>
              <td>
                <Link
                  href={`/admin/orders/${order.id}` as Route}
                  aria-label={`Ochish: ${order.id}`}
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
