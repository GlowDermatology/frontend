import type { ToastTone } from "@/components/ui/toast";
import type { Tone } from "@/components/ui/badge";
import { orderLabelsCopy } from "@/domain/copy/orders";
import type { DeliveryIssueRef, Order, OrderDelivery, ShipmentStage } from "@/domain/order";
import type { DispatchPhase } from "@/domain/order-dispatch";
import { createFormatter, toLocalIsoDate } from "@/lib/format";
import type { Locale } from "@/lib/i18n/locales";

import { ordersCopy } from "./copy";

/**
 * Pure helpers of the order page's carrier-neutral delivery card (Yandex
 * Delivery plan §4): the "Kuryer chaqirish" offer, the manual delivery
 * notice, the promised window, weights and the local upsert of a staff
 * incident. Unit-tested.
 */

export const STAGE_TONE: Record<ShipmentStage, Tone> = {
  awaiting_dispatch: "warning",
  courier_requested: "gold",
  courier_assigned: "gold",
  courier_arrived: "gold",
  in_transit: "neutral",
  at_destination: "neutral",
  delivered: "success",
  returning: "danger",
  returned: "danger",
  cancelled: "muted",
  failed: "danger",
};

/** What the "Kuryer chaqirish" button opens. */
export interface DispatchOffer {
  /** The open price review the dialog loads the amounts of (`dispatch_review`). */
  review: DeliveryIssueRef | null;
  /** The button's label: a first call, a retry after a failure, a new trip after a return. */
  label: string;
}

/**
 * Whether the order page offers "Kuryer chaqirish": a Yandex order whose
 * `available_actions.dispatch` is `true` (the server checked the stage, the
 * pin, the warehouse calendar and that no claim is open). An API that does
 * not send the key (before phase 3) has no dispatch endpoint: no button.
 */
export function dispatchOffer(
  order: Pick<Order, "availableActions" | "delivery">,
  locale: Locale = "uz",
): DispatchOffer | null {
  const delivery = order.delivery;
  if (delivery?.provider !== "yandex" || order.availableActions.dispatch !== true) return null;
  const t = ordersCopy[locale].dispatchOffer;
  const review = delivery.openIssues.find((issue) => issue.kind === "dispatch_review") ?? null;
  const label = review
    ? t.review
    : delivery.stage === "failed"
      ? t.retry
      : delivery.stage === "returned"
        ? t.resend
        : t.call;
  return { review, label };
}

/**
 * The order's manual "Yetkazildi" while Yandex lost track of the parcel: the
 * server lists it in `available_actions.transitions` only while a
 * `parcel_unaccounted` issue is open (plan §3.8); the delivery card points
 * to it so it is never hidden behind the status menu.
 */
export function manualDeliveryOffered(
  order: Pick<Order, "availableActions" | "delivery">,
): boolean {
  return (
    order.delivery?.provider === "yandex" &&
    order.availableActions.transitions.includes("delivered")
  );
}

/** Stages that mean a courier took the claim (the poll's "found" toast). */
const COURIER_FOUND: ReadonlyArray<ShipmentStage> = [
  "courier_assigned",
  "courier_arrived",
  "in_transit",
  "at_destination",
  "delivered",
];

export interface DispatchToast {
  tone: ToastTone;
  title: string;
  description?: string;
}

/**
 * The toast of a dispatch's outcome (the 202 answer or the end of the poll):
 * a courier found (success), still searching (success: the call went out),
 * or the issue that ended the attempt (a price review or an unclear answer:
 * warning; no courier: danger). `null` for a stage the dispatch did not lead
 * to (e.g. cancelled meanwhile).
 */
export function dispatchToast(
  phase: DispatchPhase,
  order: Pick<Order, "delivery">,
  locale: Locale = "uz",
): DispatchToast | null {
  const t = ordersCopy[locale].dispatchToast;
  switch (phase.kind) {
    case "searching":
      return { tone: "success", title: t.called, description: t.calledHint };
    case "moved": {
      if (phase.stage === null || !COURIER_FOUND.includes(phase.stage)) return null;
      const courier = order.delivery?.courierName;
      return {
        tone: "success",
        title: t.found,
        description: `${orderLabelsCopy[locale].shipmentStage[phase.stage]}${courier ? ` · ${courier}` : ""}`,
      };
    }
    case "issue":
      switch (phase.issueKind) {
        case "dispatch_review":
          return { tone: "warning", title: t.review, description: t.reviewHint };
        case "dispatch_unknown":
          return { tone: "warning", title: t.unknown, description: t.unknownHint };
        default:
          return {
            tone: "danger",
            title: t.failed,
            description: phase.code ? t.failedReason(phase.code) : t.failedHint,
          };
      }
  }
}

/** The poll ran its 3 minutes and Yandex is still searching. */
export function dispatchTimeoutToast(locale: Locale = "uz"): DispatchToast {
  const t = ordersCopy[locale].dispatchToast;
  return { tone: "info", title: t.timeout, description: t.timeoutHint };
}

/** The Uzbek timeout toast (`dispatchTimeoutToast("uz")`). */
export const DISPATCH_TIMEOUT_TOAST: DispatchToast = dispatchTimeoutToast("uz");

/** "24-okt, 14:05–15:35", or both ends in full when they fall on different days. */
export function promisedWindow(
  from: string | null,
  to: string | null,
  locale: Locale = "uz",
): string | null {
  if (!from && !to) return null;
  const fmt = createFormatter(locale);
  const t = ordersCopy[locale].window;
  if (!from) return t.until(fmt.dateTimeShort(to!));
  if (!to) return t.from(fmt.dateTimeShort(from));
  return toLocalIsoDate(from) === toLocalIsoDate(to)
    ? `${fmt.dateTimeShort(from)}–${fmt.time(to)}`
    : `${fmt.dateTimeShort(from)} – ${fmt.dateTimeShort(to)}`;
}

/** Parcel weight in grams as staff weigh it: "650 g", "1 250 g" ("1 250 г", "1,250 g"). */
export function formatGrams(grams: number, locale: Locale = "uz"): string {
  return orderLabelsCopy[locale].grams(createFormatter(locale).number(grams));
}

/**
 * The order with a staff incident the API just answered (201 new / 200
 * refreshed), so the card shows it at once: replaced by id, else added; the
 * list keeps the API's order (urgent first, then oldest first).
 */
export function withOpenIssue(order: Order, issue: DeliveryIssueRef): Order {
  const delivery: OrderDelivery | null | undefined = order.delivery;
  if (!delivery) return order;
  const others = delivery.openIssues.filter((row) => row.id !== issue.id);
  const openIssues = [...others, issue].sort(
    (a, b) => Number(b.urgent) - Number(a.urgent) || a.openedAt.localeCompare(b.openedAt),
  );
  return { ...order, delivery: { ...delivery, openIssues } };
}
