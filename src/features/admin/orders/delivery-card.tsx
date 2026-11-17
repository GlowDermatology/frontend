import Link from "next/link";
import type { Route } from "next";
import type { ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardTitle, DetailRow } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { orderLabelsCopy } from "@/domain/copy/orders";
import {
  carrierLabel,
  issueKindLabel,
  type DeliveryIssueRef,
  type Order,
  type OrderDelivery,
} from "@/domain/order";
import { cn } from "@/lib/cn";
import { useCopy } from "@/lib/i18n/admin-context";
import { useFormat } from "@/lib/i18n/admin-hooks";

import { ordersCopy } from "./copy";
import { formatGrams, manualDeliveryOffered, promisedWindow, STAGE_TONE } from "./delivery-view";

const rowClass = "leading-5";

/** A server amount, or a dash while the API has none (never computed here). */
function Money({ value }: { value: number | null }) {
  const fmt = useFormat();
  return value === null ? (
    <span className="text-ink-muted">—</span>
  ) : (
    <span className="tabular-nums">{fmt.som(value)}</span>
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
  disabledReason,
}: {
  order: Order;
  children?: ReactNode;
  onMarkDelivered?: () => void;
  /** Why "Yetkazildi deb belgilash" cannot run now (another action is running). */
  disabledReason?: string | false | null;
}) {
  const t = useCopy(ordersCopy).delivery;
  const labels = useCopy(orderLabelsCopy);
  const fmt = useFormat();
  const delivery = order.delivery as OrderDelivery;
  const window = promisedWindow(delivery.promisedFrom, delivery.promisedTo, fmt.locale);
  const courier = [delivery.courierName, delivery.courierVehicle].filter(Boolean).join(" · ");
  const difference = delivery.costDifference;
  return (
    <Card aria-labelledby="order-delivery-title" className="flex flex-col gap-2.5">
      <div className="flex items-center justify-between gap-3">
        <CardTitle id="order-delivery-title">{t.title}</CardTitle>
        {delivery.stage ? (
          <Badge tone={STAGE_TONE[delivery.stage]}>{labels.shipmentStage[delivery.stage]}</Badge>
        ) : (
          <Badge tone="muted">{t.stageUnknown}</Badge>
        )}
      </div>
      <dl className="m-0 flex flex-col gap-2.5">
        <DetailRow label={t.service} className={rowClass}>
          {carrierLabel(order, fmt.locale)}
        </DetailRow>
        {window && (
          <DetailRow label={t.promised} className={rowClass}>
            <span className="tabular-nums">{window}</span>
          </DetailRow>
        )}
        {courier && (
          <DetailRow label={t.courier} className={rowClass}>
            <span className="break-words">{courier}</span>
          </DetailRow>
        )}
        {delivery.trackingUrl && (
          <DetailRow label={t.tracking} className={rowClass}>
            <a
              href={delivery.trackingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-bold text-ink underline decoration-gold underline-offset-4"
            >
              {t.openMap}
              <Icon name="link" size={14} />
              <span className="sr-only">{t.newWindow}</span>
            </a>
          </DetailRow>
        )}
        {(delivery.claimStatus || delivery.claimNumber !== null) && (
          <DetailRow label={t.yandexStatus} className={rowClass}>
            <span className="break-all tabular-nums">
              {delivery.claimStatus && (
                <code className="rounded-sm bg-surface px-1 text-[12px]">
                  {delivery.claimStatus}
                </code>
              )}
              {delivery.claimNumber !== null && (
                <span className="text-ink-muted">
                  {delivery.claimStatus ? " · " : ""}
                  {t.attempt(delivery.claimNumber)}
                </span>
              )}
            </span>
          </DetailRow>
        )}
        {delivery.failureCode && (
          <DetailRow label={t.errorCode} className={rowClass}>
            <code className="rounded-sm bg-surface px-1 text-[12px] break-all">
              {delivery.failureCode}
            </code>
          </DetailRow>
        )}
        {delivery.parcelWeightG !== null && (
          <DetailRow label={t.weight} className={rowClass}>
            <span className="tabular-nums">{formatGrams(delivery.parcelWeightG, fmt.locale)}</span>
          </DetailRow>
        )}
        {delivery.preparedAt && (
          <DetailRow label={t.prepared} className={rowClass}>
            <time dateTime={delivery.preparedAt} className="tabular-nums">
              {fmt.dateTimeShort(delivery.preparedAt)}
            </time>
          </DetailRow>
        )}
      </dl>

      {manualDeliveryOffered(order) && (
        <div className="flex flex-col gap-2 rounded-md bg-warning-soft px-3 py-2.5">
          <p className="m-0 text-body-sm text-ink">{t.untracked}</p>
          {onMarkDelivered && (
            <Button
              variant="secondary"
              size="sm"
              className="self-start"
              onClick={onMarkDelivered}
              disabledReason={disabledReason}
            >
              <Icon name="check" size={16} />
              {t.markDelivered}
            </Button>
          )}
        </div>
      )}

      <span aria-hidden="true" className="h-px bg-line" />
      <h3 className="m-0 text-body-sm font-bold text-ink">{t.price}</h3>
      <dl className="m-0 flex flex-col gap-2.5">
        <DetailRow label={t.quoteFee} className={rowClass}>
          <Money value={delivery.quoteFee} />
        </DetailRow>
        <DetailRow label={t.carrierPrice} className={rowClass}>
          <Money value={delivery.carrierPrice} />
        </DetailRow>
        <DetailRow label={t.offerPrice} className={rowClass}>
          <Money value={delivery.offerPrice} />
        </DetailRow>
        {delivery.approvedPrice !== null && (
          <DetailRow label={t.approvedPrice} className={rowClass}>
            <Money value={delivery.approvedPrice} />
          </DetailRow>
        )}
        <DetailRow label={t.finalPrice} className={rowClass}>
          <Money value={delivery.carrierCostTotal} />
        </DetailRow>
        <DetailRow label={t.difference} className={rowClass}>
          {difference === null ? (
            <span className="text-ink-muted">—</span>
          ) : (
            <span
              className={cn("font-bold tabular-nums", difference < 0 ? "text-danger" : "text-ink")}
            >
              {t.signedSom(fmt.signed(difference))}
            </span>
          )}
        </DetailRow>
      </dl>
      <p className="m-0 text-[12px] leading-[18px] text-ink-muted">{t.priceNote}</p>
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
  const t = useCopy(ordersCopy).delivery;
  const fmt = useFormat();
  return (
    <>
      <span aria-hidden="true" className="h-px bg-line" />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="m-0 text-body-sm font-bold text-ink">
          {issues.length > 0 ? t.issuesCount(issues.length) : t.issues}
        </h3>
        {action}
      </div>
      {issues.length === 0 ? (
        <p className="m-0 text-[12px] leading-[18px] text-ink-muted">{t.noIssues}</p>
      ) : (
        <ul aria-label={t.issues} className="m-0 flex list-none flex-col gap-2 p-0">
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
                {issueKindLabel(issue.kind, fmt.locale)}
                {issue.urgent && <span className="text-[12px] text-danger">{t.urgent}</span>}
              </span>
              <span className="text-[12px] leading-[18px] break-all text-ink-muted tabular-nums">
                <code>{issue.code}</code> ·{" "}
                <time dateTime={issue.openedAt}>{fmt.dateTimeShort(issue.openedAt)}</time>
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
          {t.openQueue}
          <Icon name="chevron-right" size={16} />
        </Link>
      )}
    </>
  );
}
