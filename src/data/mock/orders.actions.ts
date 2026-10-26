import { orderActions, type Order, type OrderStatus, type Refund } from "@/domain/order";

import { referenceNow } from "../config";
import type { ActionResult } from "../types";
import { delay } from "./delay";
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

export async function cancelOrder(orderId: number, reason: string): Promise<ActionResult<Order>> {
  await delay(450);
  const order = await getOrder(orderId);
  if (!order) return NOT_FOUND;
  if (!order.availableActions.cancel) {
    return { ok: false, error: "Bu buyurtmani bekor qilib bo‘lmaydi.", code: "not_cancellable" };
  }
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
    order.shipment.state === "created" ? "BTS buyurtmasi bekor qilindi" : null,
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
