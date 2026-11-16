import { Badge } from "@/components/ui/badge";
import { Icon } from "@/components/ui/icon";
import {
  FINISHED_STAGES,
  courierShown,
  etaShown,
  shouldRefreshDelivery,
  type ShopOrderDelivery,
} from "@/domain/shop-delivery";
import type { ShopOrderSummary } from "@/domain/shop-account";
import type { Locale } from "@/lib/i18n/locales";

import { ordersCopy } from "../copy/orders";
import { DeliveryRefresh } from "./delivery-refresh";
import { formatEtaWindow, stageTone } from "./delivery-format";

/**
 * The courier part of the order page's delivery panel (Yandex orders, plan
 * §3.4): the method, the shipment stage, the promised window, the courier's
 * name and vehicle while one is on the job (never a phone number: the API
 * sends none), the carrier's tracking page (external, https only) and the
 * 30 s refresh while the parcel is on its way. Labels are the server's.
 */
export function DeliveryStatus({
  locale,
  order,
  delivery,
  carrier,
}: {
  locale: Locale;
  order: Pick<ShopOrderSummary, "status">;
  delivery: ShopOrderDelivery;
  /** The shipment's carrier name ("Yandex"). */
  carrier: string;
}) {
  const t = ordersCopy[locale].order;
  const open = order.status !== "cancelled" && order.status !== "delivered";
  const eta =
    open && etaShown(delivery) ? formatEtaWindow(delivery.etaFrom, delivery.etaTo, locale) : null;
  const courier = courierShown(delivery)
    ? [delivery.courierName, delivery.courierVehicle].filter(Boolean).join(" · ")
    : null;
  const live = shouldRefreshDelivery({ status: order.status, delivery });
  // The carrier's page follows a parcel under way, not one that arrived or came back.
  const tracking =
    open && (delivery.stage === null || !FINISHED_STAGES.has(delivery.stage))
      ? delivery.trackingUrl
      : null;
  return (
    <div className="flex flex-col gap-3">
      <dl className="m-0 flex flex-col gap-2 text-body-sm">
        {delivery.methodLabel ? (
          <div className="flex justify-between gap-3">
            <dt className="text-ink-muted">{t.method}</dt>
            <dd className="m-0 text-right font-semibold">
              {carrier ? `${carrier} · ${delivery.methodLabel}` : delivery.methodLabel}
            </dd>
          </div>
        ) : null}
        {delivery.stageLabel ? (
          <div className="flex items-center justify-between gap-3">
            <dt className="text-ink-muted">{t.stage}</dt>
            <dd className="m-0" aria-live="polite">
              <Badge tone={stageTone(delivery.stage)}>{delivery.stageLabel}</Badge>
            </dd>
          </div>
        ) : null}
        {eta ? (
          <div className="flex justify-between gap-3">
            <dt className="text-ink-muted">{t.eta}</dt>
            <dd className="m-0 text-right tabular-nums">{eta}</dd>
          </div>
        ) : null}
        {courier ? (
          <div className="flex justify-between gap-3">
            <dt className="text-ink-muted">{t.courier}</dt>
            <dd className="m-0 text-right">{courier}</dd>
          </div>
        ) : null}
      </dl>
      {tracking ? (
        <a
          href={tracking}
          rel="noopener"
          target="_blank"
          className="inline-flex items-center gap-1.5 self-start text-label font-semibold text-ink underline decoration-gold underline-offset-4"
        >
          <Icon name="map-pin" size={16} className="text-gold-ink" />
          {t.trackCourier}
        </a>
      ) : null}
      <DeliveryRefresh active={live} label={t.live} />
    </div>
  );
}
