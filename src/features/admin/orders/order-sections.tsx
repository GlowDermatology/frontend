import Image from "next/image";
import Link from "next/link";
import type { Route } from "next";

import { ProductArt } from "@/components/brand/product-art";
import { ScrollRegion } from "@/components/ui/scroll-region";
import { Avatar } from "@/components/ui/avatar";
import { Badge, type Tone } from "@/components/ui/badge";
import { Card, CardTitle, DetailRow } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import {
  itemsSubtotal,
  promoSubtotal,
  REFUND_STATE_LABEL,
  shipmentPending,
  type EventSource,
  type Order,
  type OrderCashbackEntry,
  type OrderEvent,
  type OrderItem,
  type OrderStatus,
} from "@/domain/order";
import { cn } from "@/lib/cn";
import {
  formatDateTimeShort,
  formatDayMonthShort,
  formatNumber,
  formatPhone,
  formatSigned,
  formatSom,
} from "@/lib/format";

import {
  ORDER_STATUS_META,
  PaymentStatusBadge,
  PROVIDER_LABEL,
  REFUND_TONE,
} from "../shared/status";

const rowClass = "leading-5";

export function OrderItemsCard({ order }: { order: Order }) {
  const subtotal = itemsSubtotal(order.items);
  const paid = order.payment.status === "paid" || order.payment.status === "refunded";

  return (
    <section
      aria-labelledby="order-items-title"
      className="overflow-hidden rounded-lg bg-surface-raised shadow-sm"
    >
      <CardTitle id="order-items-title" className="px-5 py-4">
        Mahsulotlar
      </CardTitle>
      <ScrollRegion label="Buyurtma mahsulotlari">
        <table className="data-table min-w-[600px]">
          <thead>
            <tr>
              <th scope="col">MAHSULOT</th>
              <th scope="col">BILLZ</th>
              <th scope="col" className="text-right!">
                SONI
              </th>
              <th scope="col" className="text-right!">
                NARX
              </th>
              <th scope="col" className="text-right!">
                JAMI
              </th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((item) => (
              <tr key={item.productId}>
                <td>
                  <span className="flex items-center gap-3">
                    <ItemThumbnail item={item} />
                    <span className="flex flex-col gap-1">
                      <span className="font-semibold">{item.name}</span>
                      {item.promo && (
                        <span className="text-[12px] text-ink-muted">
                          Aksiya · cashback hisoblanmaydi
                        </span>
                      )}
                    </span>
                  </span>
                </td>
                <td className="text-ink-muted! tabular-nums">{item.billzId}</td>
                <td className="text-right tabular-nums">{item.quantity}</td>
                <td className="text-right tabular-nums">{formatNumber(item.unitPrice)}</td>
                <td className="text-right font-bold tabular-nums">
                  {formatNumber(item.unitPrice * item.quantity)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </ScrollRegion>
      <div className="flex justify-end border-t border-line px-5 py-4">
        <dl className="flex w-full max-w-[360px] flex-col gap-2 text-[14px] leading-5 text-ink">
          <TotalRow label="Mahsulotlar" value={formatSom(subtotal)} />
          {order.fulfilment === "delivery" && (
            <TotalRow label="Yetkazib berish (BTS)" value={formatSom(order.deliveryFee)} />
          )}
          {order.cashbackUsed > 0 && (
            <TotalRow label="Cashback chegirmasi" value={formatSom(-order.cashbackUsed)} />
          )}
          <span aria-hidden="true" className="h-px bg-line" />
          <TotalRow
            label={paid ? "To‘langan" : "To‘lanishi kerak"}
            value={formatSom(order.total)}
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

const SOURCE_LABEL: Record<EventSource, string> = { system: "TIZIM", bts: "BTS", admin: "ADMIN" };

const STATUS_DOT: Record<OrderStatus, string> = {
  awaiting_payment: "bg-warning",
  processing: "bg-gold",
  handed_to_courier: "bg-ink-muted",
  delivered: "bg-success",
  cancelled: "bg-danger",
};

/** "23-okt, 16:40", or "24-okt, hozir" for something that just happened. */
function eventTime(at: string, now: string): string {
  const age = new Date(now).getTime() - new Date(at).getTime();
  return age >= 0 && age < 60_000 ? `${formatDayMonthShort(at)}, hozir` : formatDateTimeShort(at);
}

export function OrderHistoryCard({
  events,
  now,
}: {
  events: ReadonlyArray<OrderEvent>;
  now: string;
}) {
  return (
    <Card aria-labelledby="order-history-title" className="flex flex-col gap-4">
      <CardTitle id="order-history-title">Holatlar tarixi</CardTitle>
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
                {eventTime(event.at, now)}
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
              <span className={cn("flex flex-col gap-1", !last && "pb-[18px]")}>
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
                    <span className="sr-only">Manba: </span>
                    {SOURCE_LABEL[event.source]}
                  </span>
                </span>
                <span className="text-body-sm text-ink-muted tabular-nums">{event.note}</span>
              </span>
            </li>
          );
        })}
      </ol>
    </Card>
  );
}

export function OrderCustomerCard({ order }: { order: Order }) {
  const { customer } = order;
  return (
    <Card aria-labelledby="order-customer-title" className="flex flex-col gap-3">
      <CardTitle id="order-customer-title">Mijoz</CardTitle>
      <Link
        href={`/admin/customers/${customer.id}` as Route}
        className="group -m-1 flex items-center gap-3 rounded-md p-1 text-ink no-underline transition-colors duration-150 hover:bg-surface"
      >
        <Avatar name={customer.name} size={40} className="text-[14px]" />
        <span className="flex flex-1 flex-col">
          <span className="text-[14px] leading-5 font-bold group-hover:underline group-hover:decoration-gold group-hover:underline-offset-4">
            {customer.name}
          </span>
          <span className="text-body-sm text-ink-muted tabular-nums">
            {formatPhone(customer.phone)}
          </span>
        </span>
        <Icon name="chevron-right" size={18} className="text-ink-muted" />
      </Link>
      <span aria-hidden="true" className="h-px bg-line" />
      {order.fulfilment === "delivery" && order.address ? (
        <p className="m-0 flex gap-2.5 text-body-sm leading-5 text-ink">
          <Icon name="map-pin" size={18} className="mt-px shrink-0 text-gold-ink" />
          <span>
            <span className="sr-only">Manzil: </span>
            {order.address}
          </span>
        </p>
      ) : (
        <p className="m-0 flex gap-2.5 text-body-sm leading-5 text-ink">
          <Icon name="store" size={18} className="mt-px shrink-0 text-gold-ink" />
          Do‘kondan olib ketadi
        </p>
      )}
    </Card>
  );
}

export function OrderPaymentCard({ order }: { order: Order }) {
  const { payment } = order;
  return (
    <Card aria-labelledby="order-payment-title" className="flex flex-col gap-2.5">
      <div className="flex items-center justify-between gap-3">
        <CardTitle id="order-payment-title">To‘lov</CardTitle>
        <PaymentStatusBadge status={payment.status} />
      </div>
      <dl className="m-0 flex flex-col gap-2.5">
        <DetailRow label="Usul" className={rowClass}>
          {PROVIDER_LABEL[payment.provider]}
        </DetailRow>
        {payment.transactionId && (
          <DetailRow label="Tranzaksiya" className={rowClass}>
            <span className="tabular-nums">{payment.transactionId}</span>
          </DetailRow>
        )}
        <DetailRow label="Summa" className={rowClass}>
          <span className="tabular-nums">{formatSom(order.total)}</span>
        </DetailRow>
        {payment.confirmedAt && (
          <DetailRow label="Tasdiqlangan" className={rowClass}>
            <time dateTime={payment.confirmedAt} className="tabular-nums">
              {formatDateTimeShort(payment.confirmedAt)}
            </time>
          </DetailRow>
        )}
      </dl>
      {order.refunds.length > 0 && (
        <>
          <span aria-hidden="true" className="h-px bg-line" />
          <p className="m-0 flex items-center justify-between gap-3 text-body-sm leading-5 font-bold text-ink">
            <span>{REFUND_STATE_LABEL[order.refunds[0]!.state]}</span>
            <Badge tone={REFUND_TONE[order.refunds[0]!.state]}>Qaytarish</Badge>
          </p>
          <ul aria-label="Qaytarishlar" className="m-0 flex list-none flex-col gap-1.5 p-0">
            {order.refunds.map((refund) => (
              <li
                key={refund.id}
                className="flex flex-wrap items-baseline justify-between gap-x-3 text-[12px] leading-[18px] text-ink-muted"
              >
                <span className="tabular-nums">
                  <time dateTime={refund.requestedAt}>
                    {formatDateTimeShort(refund.requestedAt)}
                  </time>{" "}
                  · {REFUND_STATE_LABEL[refund.state]}
                </span>
                <span className="font-bold text-ink tabular-nums">{formatSom(refund.amount)}</span>
              </li>
            ))}
          </ul>
          <Link
            href={`/admin/payments?q=${order.id}` as Route}
            className="flex min-h-11 items-center gap-1 self-start text-body-sm font-bold text-ink no-underline hover:underline hover:decoration-gold"
          >
            To‘lovlar bo‘limida ochish
            <Icon name="chevron-right" size={16} />
          </Link>
        </>
      )}
    </Card>
  );
}

function shipmentBadge(order: Order): { label: string; tone: Tone } {
  const { shipment } = order;
  if (shipmentPending(shipment)) return { label: "Yuborilmoqda…", tone: "warning" };
  if (shipment.state === "failed") return { label: "Yuborilmadi", tone: "danger" };
  if (shipment.state !== "created") return { label: "Yaratilmagan", tone: "muted" };
  if (order.status === "cancelled") return { label: "Bekor qilish so‘raldi", tone: "danger" };
  if (order.status === "handed_to_courier" || order.status === "delivered") {
    return ORDER_STATUS_META[order.status];
  }
  return { label: "Yaratildi", tone: "gold" };
}

export function OrderShipmentCard({ order }: { order: Order }) {
  const { shipment } = order;
  const badge = shipmentBadge(order);
  return (
    <Card aria-labelledby="order-shipment-title" className="flex flex-col gap-2.5">
      <div className="flex items-center justify-between gap-3">
        <CardTitle id="order-shipment-title">BTS yetkazish</CardTitle>
        <Badge tone={badge.tone}>{badge.label}</Badge>
      </div>
      {shipment.state === "created" && (
        <dl className="m-0 flex flex-col gap-2.5">
          <DetailRow label="BTS raqami" className={rowClass}>
            <span className="tabular-nums">{shipment.trackingNumber}</span>
          </DetailRow>
          <DetailRow label="Tarif" className={rowClass}>
            <span className="tabular-nums">{formatSom(shipment.tariff)}</span>
          </DetailRow>
          <DetailRow label="Oxirgi yangilanish" className={rowClass}>
            <span className="tabular-nums">
              {formatDateTimeShort(shipment.updatedAt)} ·{" "}
              {shipment.via === "webhook" ? "Webhook" : "Polling"}
            </span>
          </DetailRow>
        </dl>
      )}
      {shipment.state === "failed" && (
        <>
          <dl className="m-0 flex flex-col gap-2.5">
            <DetailRow label="Oxirgi urinish" className={rowClass}>
              <span className="tabular-nums">{formatDateTimeShort(shipment.lastAttemptAt)}</span>
            </DetailRow>
            {shipment.attempts !== undefined && (
              <DetailRow label="Urinishlar" className={rowClass}>
                <span className="tabular-nums">{shipment.attempts}</span>
              </DetailRow>
            )}
          </dl>
          <p className="m-0 text-[12px] leading-[18px] text-ink-muted" aria-live="polite">
            {shipment.pending
              ? "BTS so‘rovi yuborilmoqda. Natija kelishi bilan sahifa yangilanadi."
              : order.availableActions.retryShipment
                ? "Avtomatik yuborish muvaffaqiyatsiz tugadi. «BTS ga yuborish» tugmasi bilan qayta urinib ko‘ring."
                : "Avtomatik yuborish muvaffaqiyatsiz tugadi."}
          </p>
        </>
      )}
      {shipment.state === "not_created" && (
        <p className="m-0 text-[12px] leading-[18px] text-ink-muted" aria-live="polite">
          {shipment.pending
            ? "BTS so‘rovi yuborilmoqda."
            : order.status === "cancelled"
              ? "Buyurtma BTS ga yuborilmagan."
              : "To‘lov tasdiqlangach BTS buyurtmasi avtomatik yaratiladi."}
        </p>
      )}
    </Card>
  );
}

const CASHBACK_BADGE: Record<OrderCashbackEntry["kind"], { label: string; tone: Tone }> = {
  debit: { label: "Ishlatildi", tone: "gold" },
  credit: { label: "Hisoblandi", tone: "success" },
  reversal: { label: "Qaytarildi", tone: "neutral" },
};

export function OrderCashbackCard({ order }: { order: Order }) {
  const promo = promoSubtotal(order.items);
  const reversible = order.cashback.filter((entry) => entry.kind !== "reversal").length;
  const notes: string[] = [];
  if (promo > 0) notes.push(`Aksiyadagi ${formatSom(promo)} hisobga olinmadi.`);
  if (order.status === "awaiting_payment") {
    notes.push("Cashback to‘lov tasdiqlangach hisoblanadi.");
  } else if (order.status !== "cancelled" && reversible > 0) {
    notes.push(
      reversible > 1
        ? "Bekor qilinsa, ikkala yozuv ham qarama-qarshi yozuv bilan qaytariladi."
        : "Bekor qilinsa, yozuv qarama-qarshi yozuv bilan qaytariladi.",
    );
  }

  const hold = order.cashbackHold;
  if (hold?.state === "active") {
    notes.push(
      `${formatSom(hold.amount)} cashback band qilingan (${formatDateTimeShort(hold.expiresAt)} gacha).`,
    );
  }

  return (
    <Card aria-labelledby="order-cashback-title" className="flex flex-col gap-2.5">
      <CardTitle id="order-cashback-title">Cashback</CardTitle>
      {order.cashback.length > 0 ? (
        <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
          {order.cashback.map((entry, index) => {
            const badge = CASHBACK_BADGE[entry.kind];
            return (
              <li
                key={`${entry.kind}-${index}`}
                className="flex items-center justify-between gap-3 text-body-sm leading-5 text-ink-muted"
              >
                <span className="tabular-nums">{entry.label}</span>
                <Badge tone={badge.tone}>{badge.label}</Badge>
                <span className="font-bold text-ink tabular-nums">
                  {formatSigned(entry.amount)}
                </span>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="m-0 text-body-sm text-ink-muted">
          Bu buyurtmada cashback ishlatilmagan va hisoblanmagan.
        </p>
      )}
      {notes.length > 0 && (
        <p className="m-0 text-[12px] leading-[18px] text-ink-muted">{notes.join(" ")}</p>
      )}
    </Card>
  );
}
