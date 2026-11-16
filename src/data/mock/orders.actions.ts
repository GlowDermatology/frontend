import {
  DELIVERY_METHOD_LABEL,
  orderActions,
  type Order,
  type OrderDelivery,
  type OrderStatus,
  type Refund,
} from "@/domain/order";
import type { DispatchInput } from "@/domain/order-dispatch";
import { formatNumber } from "@/lib/format";

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
 * use the contract's codes and messages.
 */

const NOT_FOUND: ActionResult<never> = {
  ok: false,
  error: "Topilmadi.",
  code: "not_found",
};

const STATUS_TITLE: Record<OrderStatus, string> = {
  awaiting_payment: "To‘lov kutilmoqda",
  processing: "Jarayonda",
  handed_to_courier: "Kuryerga topshirildi",
  delivered: "Yetkazildi",
  cancelled: "Bekor qilindi",
};

const withActions = (order: Order): Order => ({ ...order, availableActions: orderActions(order) });

/** The backend's Uzbek messages (INTERFACES-dispatch, INTERFACES-cancel). */
export const MESSAGE_DISPATCH_REFUSED = "Bu buyurtma uchun kuryer chaqirib bo‘lmaydi.";
export const MESSAGE_DISPATCH_NO_REVIEW = "Bu buyurtmada tasdiqlanadigan narx yo‘q.";
export const MESSAGE_DISPATCH_TOO_HEAVY = "Jo‘natma bu yetkazish usuli uchun juda og‘ir.";
export const MESSAGE_YANDEX_RETURN_REQUESTED =
  "Yandexdan posilkani omborga qaytarish so‘raldi. Buyurtma hali bekor qilinmadi: Yandex qaytarishni tasdiqlagach, bekor qilishni qayta bosing.";
export const MESSAGE_RETURN_NOT_CONFIRMABLE =
  "Qaytayotgan posilka yo‘q: qaytishni tasdiqlab bo‘lmaydi.";

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
export async function cancelOrder(orderId: number, reason: string): Promise<ActionResult<Order>> {
  await delay(450);
  const order = await getOrder(orderId);
  if (!order) return NOT_FOUND;
  if (!order.availableActions.cancel) {
    return { ok: false, error: "Bu buyurtmani bekor qilib bo‘lmaydi.", code: "not_cancellable" };
  }
  const yandex = yandexOf(order);
  if (yandex?.stage && PICKED_UP.has(yandex.stage)) {
    return { ok: false, error: MESSAGE_YANDEX_RETURN_REQUESTED, code: "return_requested" };
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
    .map((e) => ({ kind: "reversal" as const, amount: -e.amount, label: "Qarama-qarshi yozuv" }));
  const effects = [
    refund ? "to‘lov qaytarish so‘rovi yuborildi" : null,
    reversals.length > 0 ? "cashback yozuvlari qaytarildi" : null,
  ].filter(Boolean);
  const note = [
    "Administrator",
    effects.length > 0 ? effects.join(", ") : null,
    carrierCancelled
      ? yandex
        ? "Yandex buyurtmasi bekor qilindi"
        : "BTS buyurtmasi bekor qilindi"
      : null,
    reason,
  ]
    .filter(Boolean)
    .join(" · ");
  const history: Order["history"] = [
    { at, title: STATUS_TITLE.cancelled, source: "admin", status: "cancelled", note },
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
): Promise<ActionResult<Order>> {
  await delay(450);
  const order = await getOrder(orderId);
  if (!order) return NOT_FOUND;
  if (!order.availableActions.transitions.includes(status)) {
    return { ok: false, error: "Bu holatga o‘tib bo‘lmaydi.", code: "invalid_transition" };
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
          title: STATUS_TITLE[status],
          source: "admin",
          status,
          note: pickupHandOver
            ? "Administrator · mijozga topshirildi"
            : "Administrator · holat qo‘lda o‘zgartirildi · mijozga push yuborildi",
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
export async function retryShipment(orderId: number): Promise<ActionResult<Order>> {
  await delay(700);
  const order = await getOrder(orderId);
  if (!order) return NOT_FOUND;
  if (!order.availableActions.retryShipment) {
    return { ok: false, error: "BTS ga qayta yuborib bo‘lmaydi.", code: "invalid_transition" };
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
          title: "BTS buyurtmasi yaratildi",
          source: "admin",
          note: `Qo‘lda yuborildi · yetkazish raqami ${trackingNumber}`,
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
): Promise<ActionResult<Order>> {
  await delay(600);
  const order = await getOrder(orderId);
  if (!order) return NOT_FOUND;
  const delivery = yandexOf(order);
  if (!delivery || !order.availableActions.dispatch) {
    return { ok: false, error: MESSAGE_DISPATCH_REFUSED, code: "invalid_transition" };
  }
  const method = input.method ?? delivery.method ?? "standard";
  if (input.weightG > WEIGHT_LIMIT_G[method]) {
    return { ok: false, error: MESSAGE_DISPATCH_TOO_HEAVY, code: "too_heavy" };
  }
  const approvedPrice = input.approvedPrice ?? null;
  if (
    approvedPrice !== null &&
    !delivery.openIssues.some((issue) => issue.kind === "dispatch_review")
  ) {
    return { ok: false, error: MESSAGE_DISPATCH_NO_REVIEW, code: "conflict" };
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
          title: "Kuryer chaqirildi",
          source: "admin",
          note: [
            "Administrator",
            `Yandex ${DELIVERY_METHOD_LABEL[method]}`,
            `${formatNumber(input.weightG)} g`,
            "demo: kuryer darhol biriktirildi",
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
export async function confirmReturn(orderId: number, note: string): Promise<ActionResult<Order>> {
  await delay(450);
  const order = await getOrder(orderId);
  if (!order) return NOT_FOUND;
  const delivery = yandexOf(order);
  if (!delivery || !order.availableActions.confirmReturn) {
    return { ok: false, error: MESSAGE_RETURN_NOT_CONFIRMABLE, code: "invalid_transition" };
  }
  const at = referenceNow().toISOString();
  const next: Order = {
    ...order,
    delivery: demoReturnConfirmed(delivery),
    history: [
      {
        at,
        title: "Jo‘natma omborga qaytdi",
        source: "admin",
        note: ["Qaytish qo‘lda tasdiqlandi", note.trim() || null].filter(Boolean).join(" · "),
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
