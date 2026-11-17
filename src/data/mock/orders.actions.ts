import {
  DELIVERY_METHOD_LABEL,
  orderActions,
  type Order,
  type OrderDelivery,
  type OrderStatus,
  type Refund,
} from "@/domain/order";
import { orderDataCopy, orderHistoryCopy, orderLabelsCopy } from "@/domain/copy/orders";
import type { DispatchInput } from "@/domain/order-dispatch";
import { createFormatter } from "@/lib/format";
import type { Locale } from "@/lib/i18n/locales";

import { referenceNow } from "../config";
import type { ActionResult } from "../types";
import { delay } from "./delay";
import { demoClaimId, demoDispatched, demoReturnConfirmed } from "./order-delivery";
import { getOrder } from "./orders.queries";

/**
 * Mock implementation of `src/data/orders.actions.ts`. Each mutation looks
 * the order up in the fixtures by id (never trusting a client-supplied
 * object), applies the contract's effects (§2.2) and returns the updated
 * order; nothing is persisted, so a reload restores the dataset. Refusals
 * use the contract's codes and the backend's messages in the admin language
 * (`orderDataCopy`), the history rows the mapper's words (`orderHistoryCopy`).
 */

const notFound = (locale: Locale): ActionResult<never> => ({
  ok: false,
  error: orderDataCopy[locale].notFound,
  code: "not_found",
});

const withActions = (order: Order): Order => ({ ...order, availableActions: orderActions(order) });

/** The backend's Uzbek messages (INTERFACES-dispatch, INTERFACES-cancel). */
export const MESSAGE_DISPATCH_REFUSED = orderDataCopy.uz.dispatchRefused;
export const MESSAGE_DISPATCH_NO_REVIEW = orderDataCopy.uz.dispatchNoReview;
export const MESSAGE_DISPATCH_TOO_HEAVY = orderDataCopy.uz.dispatchTooHeavy;
export const MESSAGE_YANDEX_RETURN_REQUESTED = orderDataCopy.uz.yandexReturnRequested;
export const MESSAGE_RETURN_NOT_CONFIRMABLE = orderDataCopy.uz.returnNotConfirmable;

/** Yandex class limits (courier 10 kg, express 20 kg), as `request_dispatch` checks them. */
const WEIGHT_LIMIT_G = { standard: 10_000, express: 20_000 } as const;

/** Stages of an open claim before pickup: the cancel asks Yandex to cancel it. */
const CLAIM_BEFORE_PICKUP = new Set(["courier_requested", "courier_assigned", "courier_arrived"]);
/** Stages after pickup: the cancel asks Yandex for a return first (409 `return_requested`). */
const PICKED_UP = new Set(["in_transit", "at_destination"]);

const yandexOf = (order: Order): OrderDelivery | null =>
  order.delivery?.provider === "yandex" ? order.delivery : null;

/**
 * Mock `cancel` with the carrier-aware rules of plan §3.8: a parcel with the
 * courier (in transit, at the destination) is asked back first and the
 * order stays open (409 `return_requested`, every time: the demo keeps no
 * state); an open claim before pickup is cancelled at "Yandex" with the
 * order; a returning / returned parcel needs no carrier call.
 */
export async function cancelOrder(
  orderId: number,
  reason: string,
  locale: Locale = "uz",
): Promise<ActionResult<Order>> {
  await delay(450);
  const m = orderDataCopy[locale];
  const h = orderHistoryCopy[locale];
  const order = await getOrder(orderId, locale);
  if (!order) return notFound(locale);
  if (!order.availableActions.cancel) {
    return { ok: false, error: m.notCancellable, code: "not_cancellable" };
  }
  const yandex = yandexOf(order);
  if (yandex?.stage && PICKED_UP.has(yandex.stage)) {
    return { ok: false, error: m.yandexReturnRequested, code: "return_requested" };
  }
  const carrierCancelled = yandex
    ? yandex.stage !== null && CLAIM_BEFORE_PICKUP.has(yandex.stage)
    : order.shipment.state === "created";
  const at = referenceNow().toISOString();
  const paid = order.payment.status === "paid";
  // Click refunds go through the provider; Payme is refunded by hand in its cabinet.
  const refund: Refund | null = paid
    ? {
        id: 900_000 + order.id,
        state: order.payment.provider === "click" ? "requested" : "manual_required",
        provider: order.payment.provider,
        amount: order.total,
        requestedAt: at,
        updatedAt: at,
        ...(order.payment.provider === "payme" ? { manualReason: "payme" as const } : {}),
      }
    : null;
  const reversals = order.cashback
    .filter((e) => e.kind !== "reversal")
    .map((e) => ({ kind: "reversal" as const, amount: -e.amount, label: h.cashbackReversal }));
  const effects = [
    refund ? h.refundRequestSent : null,
    reversals.length > 0 ? h.cashbackReversed : null,
  ].filter(Boolean);
  const note = [
    h.admin,
    effects.length > 0 ? effects.join(", ") : null,
    carrierCancelled ? (yandex ? h.yandexCancelled : h.btsCancelled) : null,
    reason,
  ]
    .filter(Boolean)
    .join(" · ");
  const history: Order["history"] = [
    {
      at,
      title: orderLabelsCopy[locale].status.cancelled,
      source: "admin",
      status: "cancelled",
      note,
    },
    ...order.history,
  ];
  return {
    ok: true,
    data: withActions({
      ...order,
      status: "cancelled",
      // §7.3: the payment stays `paid` until the refund succeeds.
      payment: { ...order.payment },
      refunds: refund ? [refund, ...order.refunds] : order.refunds,
      cancellation: { reason: "admin", note: reason },
      cashback: [...order.cashback, ...reversals],
      history,
      ...(yandex && carrierCancelled
        ? { delivery: { ...yandex, stage: "cancelled" as const, claimStatus: "cancelled" } }
        : {}),
    }),
  };
}

export async function changeOrderStatus(
  orderId: number,
  status: OrderStatus,
  locale: Locale = "uz",
): Promise<ActionResult<Order>> {
  await delay(450);
  const h = orderHistoryCopy[locale];
  const order = await getOrder(orderId, locale);
  if (!order) return notFound(locale);
  if (!order.availableActions.transitions.includes(status)) {
    return {
      ok: false,
      error: orderDataCopy[locale].invalidTransition,
      code: "invalid_transition",
    };
  }
  const pickupHandOver = status === "delivered" && order.fulfilment === "pickup";
  return {
    ok: true,
    data: withActions({
      ...order,
      status,
      history: [
        {
          at: referenceNow().toISOString(),
          title: orderLabelsCopy[locale].status[status],
          source: "admin",
          status,
          note: pickupHandOver
            ? `${h.admin} · ${h.handedToCustomer}`
            : `${h.admin} · ${h.changedByHand} · ${h.pushSent}`,
        },
        ...order.history,
      ],
    }),
  };
}

/**
 * Retry the BTS hand-off after an automatic attempt failed. The API answers
 * 202 with `shipment.pending` and the outcome arrives later; the demo has no
 * outbox, so it answers with the created parcel right away (the view handles
 * both).
 */
export async function retryShipment(
  orderId: number,
  locale: Locale = "uz",
): Promise<ActionResult<Order>> {
  await delay(700);
  const h = orderHistoryCopy[locale];
  const order = await getOrder(orderId, locale);
  if (!order) return notFound(locale);
  if (!order.availableActions.retryShipment) {
    return { ok: false, error: orderDataCopy[locale].retryRefused, code: "invalid_transition" };
  }
  const trackingNumber = String(48_214_000 + (order.id % 1000));
  const at = referenceNow().toISOString();
  return {
    ok: true,
    data: withActions({
      ...order,
      shipment: {
        state: "created",
        trackingNumber,
        tariff: order.deliveryFee,
        updatedAt: at,
        via: "webhook",
      },
      history: [
        {
          at,
          title: h.btsCreated,
          source: "admin",
          note: h.sentByHand(trackingNumber),
        },
        ...order.history,
      ],
    }),
  };
}

/**
 * Mock "Kuryer chaqirish" (plan §3.6) with the backend's refusals: not
 * dispatchable now (409 `invalid_transition`), an `approvedPrice` without an
 * open price review (409 `conflict`), a weight above the class limit (409
 * `too_heavy`). The demo has no outbox and no courier, so it answers with the
 * courier assigned at once (the API answers 202 at `courier_requested` and
 * the screen polls).
 */
export async function dispatchOrder(
  orderId: number,
  input: DispatchInput,
  locale: Locale = "uz",
): Promise<ActionResult<Order>> {
  await delay(600);
  const m = orderDataCopy[locale];
  const h = orderHistoryCopy[locale];
  const order = await getOrder(orderId, locale);
  if (!order) return notFound(locale);
  const delivery = yandexOf(order);
  if (!delivery || !order.availableActions.dispatch) {
    return { ok: false, error: m.dispatchRefused, code: "invalid_transition" };
  }
  const method = input.method ?? delivery.method ?? "standard";
  if (input.weightG > WEIGHT_LIMIT_G[method]) {
    return { ok: false, error: m.dispatchTooHeavy, code: "too_heavy" };
  }
  const approvedPrice = input.approvedPrice ?? null;
  if (
    approvedPrice !== null &&
    !delivery.openIssues.some((issue) => issue.kind === "dispatch_review")
  ) {
    return { ok: false, error: m.dispatchNoReview, code: "conflict" };
  }
  const at = referenceNow().toISOString();
  const next = demoDispatched(delivery, {
    orderId: order.id,
    method,
    weightG: input.weightG,
    approvedPrice,
    at,
  });
  const claimId = demoClaimId(order.id, next.claimNumber ?? 1);
  return {
    ok: true,
    data: withActions({
      ...order,
      delivery: next,
      shipment: {
        state: "created",
        trackingNumber: claimId,
        tariff: next.offerPrice ?? order.deliveryFee,
        updatedAt: at,
        via: "polling",
      },
      history: [
        {
          at,
          title: h.courierCalled,
          source: "admin",
          note: [
            h.admin,
            `Yandex ${DELIVERY_METHOD_LABEL[method]}`,
            orderLabelsCopy[locale].grams(createFormatter(locale).number(input.weightG)),
            h.demoCourierAssigned,
          ].join(" · "),
        },
        ...order.history,
      ],
    }),
  };
}

/**
 * Mock "Qaytganini tasdiqlash" (plan §3.8): a returning / returned parcel is
 * back; the `return_pending` issue is resolved and the order status stays.
 */
export async function confirmReturn(
  orderId: number,
  note: string,
  locale: Locale = "uz",
): Promise<ActionResult<Order>> {
  await delay(450);
  const h = orderHistoryCopy[locale];
  const order = await getOrder(orderId, locale);
  if (!order) return notFound(locale);
  const delivery = yandexOf(order);
  if (!delivery || !order.availableActions.confirmReturn) {
    return {
      ok: false,
      error: orderDataCopy[locale].returnNotConfirmable,
      code: "invalid_transition",
    };
  }
  const at = referenceNow().toISOString();
  const next: Order = {
    ...order,
    delivery: demoReturnConfirmed(delivery),
    history: [
      {
        at,
        title: h.returned,
        source: "admin",
        note: [h.returnConfirmedByHand, note.trim() || null].filter(Boolean).join(" · "),
      },
      ...order.history,
    ],
  };
  // The demo keeps no confirmation: say so in the answer itself.
  return {
    ok: true,
    data: { ...next, availableActions: { ...orderActions(next), confirmReturn: false } },
  };
}
