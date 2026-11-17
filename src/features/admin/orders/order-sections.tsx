import Image from "next/image";
import Link from "next/link";
import type { Route } from "next";
import type { ReactNode } from "react";

import { ProductArt } from "@/components/brand/product-art";
import { ScrollRegion } from "@/components/ui/scroll-region";
import { Avatar } from "@/components/ui/avatar";
import { Badge, type Tone } from "@/components/ui/badge";
import { Card, CardTitle, DetailRow } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { orderLabelsCopy, type OrderLabels } from "@/domain/copy/orders";
import {
  carrierLabel,
  itemsSubtotal,
  manualRefundNote,
  promoSubtotal,
  refundStateLine,
  shipmentPending,
  type Order,
  type OrderCashbackEntry,
  type OrderEvent,
  type OrderItem,
  type OrderStatus,
} from "@/domain/order";
import { cn } from "@/lib/cn";
import type { AdminFormatter } from "@/lib/format";
import { useCopy } from "@/lib/i18n/admin-context";
import { useFormat } from "@/lib/i18n/admin-hooks";

import {
  ORDER_STATUS_META,
  PAYMENT_STATUS_META,
  PROVIDER_LABEL,
  REFUND_TONE,
} from "../shared/status";
import { ordersCopy, type OrdersCopy } from "./copy";
import { customerName } from "./labels";

const rowClass = "leading-5";

export function OrderItemsCard({ order }: { order: Order }) {
  const t = useCopy(ordersCopy).sections;
  const fmt = useFormat();
  const subtotal = itemsSubtotal(order.items);
  const paid = order.payment.status === "paid" || order.payment.status === "refunded";

  return (
    <section
      aria-labelledby="order-items-title"
      className="overflow-hidden rounded-lg bg-surface-raised shadow-sm"
    >
      <CardTitle id="order-items-title" className="px-5 py-4">
        {t.items}
      </CardTitle>
      <ScrollRegion label={t.itemsTable}>
        <table className="data-table min-w-[600px]">
          <thead>
            <tr>
              <th scope="col">{t.product}</th>
              <th scope="col">{t.billz}</th>
              <th scope="col" className="text-right!">
                {t.quantity}
              </th>
              <th scope="col" className="text-right!">
                {t.price}
              </th>
              <th scope="col" className="text-right!">
                {t.lineTotal}
              </th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((item, index) => (
              <tr key={`${item.productId}-${index}`}>
                <td>
                  <span className="flex items-center gap-3">
                    <ItemThumbnail item={item} />
                    <span className="flex min-w-0 flex-col gap-1">
                      <span className="font-semibold break-words">{item.name}</span>
                      {item.promo && <span className="text-[12px] text-ink-muted">{t.promo}</span>}
                    </span>
                  </span>
                </td>
                <td className="text-ink-muted! tabular-nums">{item.billzId}</td>
                <td className="text-right tabular-nums">{fmt.number(item.quantity)}</td>
                <td className="text-right tabular-nums">{fmt.number(item.unitPrice)}</td>
                <td className="text-right font-bold tabular-nums">
                  {fmt.number(item.unitPrice * item.quantity)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </ScrollRegion>
      <div className="flex justify-end border-t border-line px-5 py-4">
        <dl className="flex w-full max-w-[360px] flex-col gap-2 text-[14px] leading-5 text-ink">
          <TotalRow label={t.itemsTotal} value={fmt.som(subtotal)} />
          {order.fulfilment === "delivery" && (
            <TotalRow
              label={t.deliveryTotal(carrierLabel(order, fmt.locale))}
              value={fmt.som(order.deliveryFee)}
            />
          )}
          {order.cashbackUsed > 0 && (
            <TotalRow label={t.cashbackDiscount} value={fmt.som(-order.cashbackUsed)} />
          )}
          <span aria-hidden="true" className="h-px bg-line" />
          <TotalRow
            label={paid ? t.paid : t.due}
            value={fmt.som(order.total)}
            className="font-bold"
            valueClassName="text-[17px]"
          />
        </dl>
      </div>
    </section>
  );
}

/** 40×40 in every state: the checkout photo (API), the fixture art, or an empty frame. */
function ItemThumbnail({ item }: { item: OrderItem }) {
  if (item.imageUrl) {
    return (
      <span className="relative flex size-10 shrink-0 overflow-hidden rounded-sm bg-surface">
        <Image src={item.imageUrl} alt="" fill sizes="40px" className="object-cover" />
      </span>
    );
  }
  if (item.art) {
    return (
      <span className="flex size-10 shrink-0 items-center justify-center rounded-sm bg-gold-soft">
        <ProductArt kind={item.art.kind} tone={item.art.tone} detail="mini" width={24} />
      </span>
    );
  }
  return (
    <span className="flex size-10 shrink-0 items-center justify-center rounded-sm border border-dashed border-line-strong text-ink-muted">
      <Icon name="image" size={16} />
    </span>
  );
}

function TotalRow({
  label,
  value,
  className,
  valueClassName,
}: {
  label: string;
  value: string;
  className?: string;
  valueClassName?: string;
}) {
  return (
    <div className={cn("flex justify-between gap-4", className)}>
      <dt>{label}</dt>
      <dd className={cn("m-0 tabular-nums", valueClassName)}>{value}</dd>
    </div>
  );
}

const STATUS_DOT: Record<OrderStatus, string> = {
  awaiting_payment: "bg-warning",
  processing: "bg-gold",
  handed_to_courier: "bg-ink-muted",
  delivered: "bg-success",
  cancelled: "bg-danger",
};

/** "23-okt, 16:40", or "24-okt, hozir" for something that just happened. */
function eventTime(at: string, now: string, fmt: AdminFormatter, t: OrdersCopy): string {
  const age = new Date(now).getTime() - new Date(at).getTime();
  return age >= 0 && age < 60_000
    ? t.sections.justNow(fmt.dayMonthShort(at))
    : fmt.dateTimeShort(at);
}

export function OrderHistoryCard({
  events,
  now,
}: {
  events: ReadonlyArray<OrderEvent>;
  now: string;
}) {
  const t = useCopy(ordersCopy);
  const fmt = useFormat();
  return (
    <Card aria-labelledby="order-history-title" className="flex flex-col gap-4">
      <CardTitle id="order-history-title">{t.sections.history}</CardTitle>
      <ol className="m-0 flex list-none flex-col p-0">
        {events.map((event, index) => {
          const last = index === events.length - 1;
          return (
            <li
              key={event.id ?? `${event.at}-${event.title}-${index}`}
              className="grid grid-cols-[84px_20px_1fr] gap-3 sm:grid-cols-[112px_20px_1fr]"
            >
              <time
                dateTime={event.at}
                className="text-body-sm leading-5 text-ink-muted tabular-nums"
              >
                {eventTime(event.at, now, fmt, t)}
              </time>
              <span aria-hidden="true" className="flex flex-col items-center">
                <span
                  className={cn(
                    "mt-1 size-3 rounded-full",
                    event.status ? STATUS_DOT[event.status] : "border-2 border-line-strong",
                  )}
                />
                {!last && <span className="min-h-4 w-0.5 flex-1 bg-line" />}
              </span>
              <span className={cn("flex min-w-0 flex-col gap-1", !last && "pb-[18px]")}>
                <span className="flex flex-wrap items-center gap-2">
                  <span
                    className={cn(
                      "text-[14px] leading-5 text-ink",
                      event.status ? "font-bold" : "font-semibold",
                    )}
                  >
                    {event.title}
                  </span>
                  <span className="rounded-sm border border-line-strong px-1.5 py-0.5 text-[11px] leading-[14px] font-bold tracking-[0.06em] text-ink">
                    <span className="sr-only">{t.sections.source}</span>
                    {t.sections.sources[event.source] ?? event.source}
                  </span>
                </span>
                {event.note && (
                  <span className="text-body-sm break-words text-ink-muted tabular-nums">
                    {event.note}
                  </span>
                )}
              </span>
            </li>
          );
        })}
      </ol>
    </Card>
  );
}

export function OrderCustomerCard({ order }: { order: Order }) {
  const t = useCopy(ordersCopy).sections;
  const labels = useCopy(orderLabelsCopy);
  const fmt = useFormat();
  const { customer } = order;
  const name = customerName(customer.name, labels);
  return (
    <Card aria-labelledby="order-customer-title" className="flex flex-col gap-3">
      <CardTitle id="order-customer-title">{t.customer}</CardTitle>
      <Link
        href={`/admin/customers/${customer.id}` as Route}
        className="group -m-1 flex items-center gap-3 rounded-md p-1 text-ink no-underline transition-colors duration-150 hover:bg-surface"
      >
        <Avatar name={name} size={40} className="shrink-0 text-[14px]" />
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="text-[14px] leading-5 font-bold break-words group-hover:underline group-hover:decoration-gold group-hover:underline-offset-4">
            {name}
          </span>
          <span className="text-body-sm text-ink-muted tabular-nums">
            {fmt.phone(customer.phone)}
          </span>
        </span>
        <Icon name="chevron-right" size={18} className="text-ink-muted" />
      </Link>
      <span aria-hidden="true" className="h-px bg-line" />
      {order.fulfilment === "delivery" && order.address ? (
        <p className="m-0 flex gap-2.5 text-body-sm leading-5 text-ink">
          <Icon name="map-pin" size={18} className="mt-px shrink-0 text-gold-ink" />
          <span className="min-w-0 break-words">
            <span className="sr-only">{t.address}</span>
            {order.address}
          </span>
        </p>
      ) : (
        <p className="m-0 flex gap-2.5 text-body-sm leading-5 text-ink">
          <Icon name="store" size={18} className="mt-px shrink-0 text-gold-ink" />
          {t.pickupAddress}
        </p>
      )}
    </Card>
  );
}

export function OrderPaymentCard({ order }: { order: Order }) {
  const t = useCopy(ordersCopy).sections;
  const labels = useCopy(orderLabelsCopy);
  const fmt = useFormat();
  const { payment } = order;
  const newest = order.refunds[0];
  // Why the newest refund is paid out by hand (§5.1 note; Payme's line says it already).
  const reasonNote = newest ? manualRefundNote(newest, fmt.locale) : null;
  return (
    <Card aria-labelledby="order-payment-title" className="flex flex-col gap-2.5">
      <div className="flex items-center justify-between gap-3">
        <CardTitle id="order-payment-title">{t.payment}</CardTitle>
        <Badge tone={PAYMENT_STATUS_META[payment.status].tone}>
          {labels.paymentStatus[payment.status]}
        </Badge>
      </div>
      <dl className="m-0 flex flex-col gap-2.5">
        <DetailRow label={t.method} className={rowClass}>
          {PROVIDER_LABEL[payment.provider]}
        </DetailRow>
        {payment.transactionId && (
          <DetailRow label={t.transaction} className={rowClass}>
            <span className="break-all tabular-nums">{payment.transactionId}</span>
          </DetailRow>
        )}
        <DetailRow label={t.amount} className={rowClass}>
          <span className="tabular-nums">{fmt.som(order.total)}</span>
        </DetailRow>
        {payment.confirmedAt && (
          <DetailRow label={t.confirmed} className={rowClass}>
            <time dateTime={payment.confirmedAt} className="tabular-nums">
              {fmt.dateTimeShort(payment.confirmedAt)}
            </time>
          </DetailRow>
        )}
      </dl>
      {newest && (
        <>
          <span aria-hidden="true" className="h-px bg-line" />
          <p className="m-0 flex items-center justify-between gap-3 text-body-sm leading-5 font-bold text-ink">
            <span>{refundStateLine(newest, fmt.locale)}</span>
            <Badge tone={REFUND_TONE[newest.state]}>{t.refund}</Badge>
          </p>
          {reasonNote && (
            <p className="m-0 text-[12px] leading-[18px] text-ink-muted">{reasonNote}</p>
          )}
          <ul aria-label={t.refunds} className="m-0 flex list-none flex-col gap-1.5 p-0">
            {order.refunds.map((refund) => (
              <li
                key={refund.id}
                className="flex flex-wrap items-baseline justify-between gap-x-3 text-[12px] leading-[18px] text-ink-muted"
              >
                <span className="tabular-nums">
                  <time dateTime={refund.requestedAt}>{fmt.dateTimeShort(refund.requestedAt)}</time>{" "}
                  · {refundStateLine(refund, fmt.locale)}
                </span>
                <span className="font-bold text-ink tabular-nums">{fmt.som(refund.amount)}</span>
              </li>
            ))}
          </ul>
          <Link
            href={`/admin/payments?q=${order.id}` as Route}
            className="flex min-h-11 items-center gap-1 self-start text-body-sm font-bold text-ink no-underline hover:underline hover:decoration-gold"
          >
            {t.openPayments}
            <Icon name="chevron-right" size={16} />
          </Link>
        </>
      )}
    </Card>
  );
}

function shipmentBadge(
  order: Order,
  t: OrdersCopy["sections"],
  labels: OrderLabels,
): { label: string; tone: Tone } {
  const { shipment } = order;
  if (shipmentPending(shipment)) return { label: t.shipmentSending, tone: "warning" };
  if (shipment.state === "failed") return { label: t.shipmentFailed, tone: "danger" };
  if (shipment.state !== "created") return { label: t.shipmentNotCreated, tone: "muted" };
  if (order.status === "cancelled") return { label: t.shipmentCancelRequested, tone: "danger" };
  if (order.status === "handed_to_courier" || order.status === "delivered") {
    return { label: labels.status[order.status], tone: ORDER_STATUS_META[order.status].tone };
  }
  return { label: t.shipmentCreated, tone: "gold" };
}

/** The BTS card; `children` (the open delivery issues) close it. */
export function OrderShipmentCard({ order, children }: { order: Order; children?: ReactNode }) {
  const t = useCopy(ordersCopy).sections;
  const labels = useCopy(orderLabelsCopy);
  const fmt = useFormat();
  const { shipment } = order;
  const badge = shipmentBadge(order, t, labels);
  return (
    <Card aria-labelledby="order-shipment-title" className="flex flex-col gap-2.5">
      <div className="flex items-center justify-between gap-3">
        <CardTitle id="order-shipment-title">{t.shipment}</CardTitle>
        <Badge tone={badge.tone}>{badge.label}</Badge>
      </div>
      {shipment.state === "created" && (
        <dl className="m-0 flex flex-col gap-2.5">
          <DetailRow label={t.btsNumber} className={rowClass}>
            <span className="tabular-nums">{shipment.trackingNumber}</span>
          </DetailRow>
          <DetailRow label={t.tariff} className={rowClass}>
            <span className="tabular-nums">{fmt.som(shipment.tariff)}</span>
          </DetailRow>
          <DetailRow label={t.lastUpdate} className={rowClass}>
            <span className="tabular-nums">
              {fmt.dateTimeShort(shipment.updatedAt)} ·{" "}
              {shipment.via === "webhook" ? "Webhook" : "Polling"}
            </span>
          </DetailRow>
        </dl>
      )}
      {shipment.state === "failed" && (
        <>
          <dl className="m-0 flex flex-col gap-2.5">
            <DetailRow label={t.lastAttempt} className={rowClass}>
              <span className="tabular-nums">{fmt.dateTimeShort(shipment.lastAttemptAt)}</span>
            </DetailRow>
            {shipment.attempts !== undefined && (
              <DetailRow label={t.attempts} className={rowClass}>
                <span className="tabular-nums">{fmt.number(shipment.attempts)}</span>
              </DetailRow>
            )}
          </dl>
          <p className="m-0 text-[12px] leading-[18px] text-ink-muted" aria-live="polite">
            {shipment.pending
              ? t.btsPending
              : order.availableActions.retryShipment
                ? t.btsRetryHint
                : t.btsFailedNote}
          </p>
        </>
      )}
      {shipment.state === "not_created" && (
        <p className="m-0 text-[12px] leading-[18px] text-ink-muted" aria-live="polite">
          {shipment.pending ? t.btsQueued : order.status === "cancelled" ? t.btsNotSent : t.btsAuto}
        </p>
      )}
      {children}
    </Card>
  );
}

const CASHBACK_TONE: Record<OrderCashbackEntry["kind"], Tone> = {
  debit: "gold",
  credit: "success",
  reversal: "neutral",
};

export function OrderCashbackCard({ order }: { order: Order }) {
  const t = useCopy(ordersCopy).sections;
  const fmt = useFormat();
  const promo = promoSubtotal(order.items);
  const reversible = order.cashback.filter((entry) => entry.kind !== "reversal").length;
  const notes: string[] = [];
  if (promo > 0) notes.push(t.cashbackPromo(fmt.som(promo)));
  if (order.status === "awaiting_payment") {
    notes.push(t.cashbackAwaiting);
  } else if (order.status !== "cancelled" && reversible > 0) {
    notes.push(reversible > 1 ? t.cashbackReverseBoth : t.cashbackReverseOne);
  }

  const hold = order.cashbackHold;
  if (hold?.state === "active") {
    notes.push(t.cashbackHold(fmt.som(hold.amount), fmt.dateTimeShort(hold.expiresAt)));
  }
  const badge: Record<OrderCashbackEntry["kind"], string> = {
    debit: t.cashbackUsed,
    credit: t.cashbackCredited,
    reversal: t.cashbackReversed,
  };

  return (
    <Card aria-labelledby="order-cashback-title" className="flex flex-col gap-2.5">
      <CardTitle id="order-cashback-title">{t.cashback}</CardTitle>
      {order.cashback.length > 0 ? (
        <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
          {order.cashback.map((entry, index) => (
            <li
              key={`${entry.kind}-${index}`}
              className="grid grid-cols-[1fr_auto_auto] items-center gap-3 text-body-sm leading-5 text-ink-muted"
            >
              <span className="min-w-0 tabular-nums">{entry.label}</span>
              <Badge tone={CASHBACK_TONE[entry.kind]}>{badge[entry.kind]}</Badge>
              <span className="min-w-[72px] text-right font-bold text-ink tabular-nums">
                {fmt.signed(entry.amount)}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="m-0 text-body-sm text-ink-muted">{t.cashbackNone}</p>
      )}
      {notes.length > 0 && (
        <p className="m-0 text-[12px] leading-[18px] text-ink-muted">{notes.join(" ")}</p>
      )}
    </Card>
  );
}
