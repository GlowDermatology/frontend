import Link from "next/link";
import type { Route } from "next";
import type { ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardTitle, DetailRow } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import {
  carrierLabel,
  issueKindLabel,
  SHIPMENT_STAGE_LABEL,
  type DeliveryIssueRef,
  type Order,
  type OrderDelivery,
} from "@/domain/order";
import { cn } from "@/lib/cn";
import { formatDateTimeShort, formatSigned, formatSom } from "@/lib/format";

import { formatGrams, manualDeliveryOffered, promisedWindow, STAGE_TONE } from "./delivery-view";

const rowClass = "leading-5";

/** A server amount, or a dash while the API has none (never computed here). */
function Money({ value }: { value: number | null }) {
  return value === null ? (
    <span className="text-ink-muted">—</span>
  ) : (
    <span className="tabular-nums">{formatSom(value)}</span>
  );
}

/**
 * The carrier-neutral delivery card of a Yandex order (plan §4): method and
 * stage, the promised window, the quote fee vs the offer vs the carrier's
 * final cost and the server's difference, the parcel, the courier's name
 * and vehicle (never a phone), the tracking link, Yandex's claim status and
 * — as `children` — the order's open issues. When the server lists the
 * manual "Yetkazildi" (a `parcel_unaccounted` issue is open) the card says so
 * next to the courier data and offers it (`onMarkDelivered`), so a
 * server-listed transition is never hidden behind the automatic statuses.
 */
export function OrderDeliveryCard({
  order,
  children,
  onMarkDelivered,
  disabled,
}: {
  order: Order;
  children?: ReactNode;
  onMarkDelivered?: () => void;
  disabled?: boolean;
}) {
  const delivery = order.delivery as OrderDelivery;
  const window = promisedWindow(delivery.promisedFrom, delivery.promisedTo);
  const courier = [delivery.courierName, delivery.courierVehicle].filter(Boolean).join(" · ");
  const difference = delivery.costDifference;
  return (
    <Card aria-labelledby="order-delivery-title" className="flex flex-col gap-2.5">
      <div className="flex items-center justify-between gap-3">
        <CardTitle id="order-delivery-title">Yetkazish</CardTitle>
        {delivery.stage ? (
          <Badge tone={STAGE_TONE[delivery.stage]}>{SHIPMENT_STAGE_LABEL[delivery.stage]}</Badge>
        ) : (
          <Badge tone="muted">Bosqich noma’lum</Badge>
        )}
      </div>
      <dl className="m-0 flex flex-col gap-2.5">
        <DetailRow label="Xizmat" className={rowClass}>
          {carrierLabel(order)}
        </DetailRow>
        {window && (
          <DetailRow label="Va’da qilingan vaqt" className={rowClass}>
            <span className="tabular-nums">{window}</span>
          </DetailRow>
        )}
        {courier && (
          <DetailRow label="Kuryer" className={rowClass}>
            {courier}
          </DetailRow>
        )}
        {delivery.trackingUrl && (
          <DetailRow label="Kuzatish" className={rowClass}>
            <a
              href={delivery.trackingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-bold text-ink underline decoration-gold underline-offset-4"
            >
              Xaritada ochish
              <Icon name="link" size={14} />
              <span className="sr-only"> (yangi oynada)</span>
            </a>
          </DetailRow>
        )}
        {(delivery.claimStatus || delivery.claimNumber !== null) && (
          <DetailRow label="Yandex holati" className={rowClass}>
            <span className="tabular-nums">
              {delivery.claimStatus && (
                <code className="rounded-sm bg-surface px-1 text-[12px]">
                  {delivery.claimStatus}
                </code>
              )}
              {delivery.claimNumber !== null && (
                <span className="text-ink-muted">
                  {delivery.claimStatus ? " · " : ""}
                  {delivery.claimNumber}-urinish
                </span>
              )}
            </span>
          </DetailRow>
        )}
        {delivery.failureCode && (
          <DetailRow label="Xato kodi" className={rowClass}>
            <code className="rounded-sm bg-surface px-1 text-[12px]">{delivery.failureCode}</code>
          </DetailRow>
        )}
        {delivery.parcelWeightG !== null && (
          <DetailRow label="Og‘irlik" className={rowClass}>
            <span className="tabular-nums">{formatGrams(delivery.parcelWeightG)}</span>
          </DetailRow>
        )}
        {delivery.preparedAt && (
          <DetailRow label="Yig‘ilgan" className={rowClass}>
            <time dateTime={delivery.preparedAt} className="tabular-nums">
              {formatDateTimeShort(delivery.preparedAt)}
            </time>
          </DetailRow>
        )}
      </dl>

      {manualDeliveryOffered(order) && (
        <div className="flex flex-col gap-2 rounded-md bg-warning-soft px-3 py-2.5">
          <p className="m-0 text-body-sm text-ink">
            Yandex bu posilkani endi kuzatmayapti. Mijoz uni olganini aniq bilsangiz, buyurtmani
            qo‘lda «Yetkazildi» deb belgilang.
          </p>
          {onMarkDelivered && (
            <Button
              variant="secondary"
              size="sm"
              className="self-start"
              onClick={onMarkDelivered}
              disabled={disabled}
            >
              <Icon name="check" size={16} />
              Yetkazildi deb belgilash
            </Button>
          )}
        </div>
      )}

      <span aria-hidden="true" className="h-px bg-line" />
      <h3 className="m-0 text-body-sm font-bold text-ink">Yetkazish narxi</h3>
      <dl className="m-0 flex flex-col gap-2.5">
        <DetailRow label="Mijoz to‘lagan" className={rowClass}>
          <Money value={delivery.quoteFee} />
        </DetailRow>
        <DetailRow label="Yandex taxmini" className={rowClass}>
          <Money value={delivery.carrierPrice} />
        </DetailRow>
        <DetailRow label="Yandex taklifi" className={rowClass}>
          <Money value={delivery.offerPrice} />
        </DetailRow>
        {delivery.approvedPrice !== null && (
          <DetailRow label="Tasdiqlangan narx" className={rowClass}>
            <Money value={delivery.approvedPrice} />
          </DetailRow>
        )}
        <DetailRow label="Yandex yakuniy narxi" className={rowClass}>
          <Money value={delivery.carrierCostTotal} />
        </DetailRow>
        <DetailRow label="Farq" className={rowClass}>
          {difference === null ? (
            <span className="text-ink-muted">—</span>
          ) : (
            <span
              className={cn("font-bold tabular-nums", difference < 0 ? "text-danger" : "text-ink")}
            >
              {formatSigned(difference)} so‘m
            </span>
          )}
        </DetailRow>
      </dl>
      <p className="m-0 text-[12px] leading-[18px] text-ink-muted">
        Mijoz to‘lagan narx o‘zgarmaydi; farqni server hisoblaydi.
      </p>
      {children}
    </Card>
  );
}

/**
 * The order's open delivery issues (both carriers), each linked to the
 * queue filtered to this order, plus the staff incident button.
 */
export function OpenIssuesSection({
  orderId,
  issues,
  action,
}: {
  orderId: number;
  issues: ReadonlyArray<DeliveryIssueRef>;
  action?: ReactNode;
}) {
  return (
    <>
      <span aria-hidden="true" className="h-px bg-line" />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="m-0 text-body-sm font-bold text-ink">
          Ochiq muammolar{issues.length > 0 ? ` (${issues.length})` : ""}
        </h3>
        {action}
      </div>
      {issues.length === 0 ? (
        <p className="m-0 text-[12px] leading-[18px] text-ink-muted">Ochiq muammo yo‘q.</p>
      ) : (
        <ul aria-label="Ochiq muammolar" className="m-0 flex list-none flex-col gap-2 p-0">
          {issues.map((issue) => (
            <li
              key={issue.id}
              className={cn(
                "flex flex-col gap-0.5 rounded-md px-3 py-2 text-body-sm",
                issue.urgent ? "bg-danger-soft" : "bg-surface",
              )}
            >
              <span className="flex flex-wrap items-center gap-2 font-bold text-ink">
                {issue.urgent && (
                  <Icon name="alert-triangle" size={14} className="shrink-0 text-danger" />
                )}
                {issueKindLabel(issue.kind)}
                {issue.urgent && <span className="text-[12px] text-danger">Shoshilinch</span>}
              </span>
              <span className="text-[12px] leading-[18px] text-ink-muted tabular-nums">
                <code>{issue.code}</code> ·{" "}
                <time dateTime={issue.openedAt}>{formatDateTimeShort(issue.openedAt)}</time>
              </span>
            </li>
          ))}
        </ul>
      )}
      {issues.length > 0 && (
        <Link
          href={`/admin/delivery-issues?order=${orderId}` as Route}
          className="flex min-h-11 items-center gap-1 self-start text-body-sm font-bold text-ink no-underline hover:underline hover:decoration-gold"
        >
          Muammolar bo‘limida ochish
          <Icon name="chevron-right" size={16} />
        </Link>
      )}
    </>
  );
}
