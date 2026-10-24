/**
 * Order mutations used by the admin UI.
 *
 * Demo mode: they compute the next state locally and resolve after a short
 * delay; nothing is persisted (the shell shows a "Demo" marker). With the
 * API, replace each body with a Server Action that calls
 * `POST /api/v1/admin/orders/{id}/<action>/` and returns the updated order —
 * the signatures stay the same.
 */
import { canCancel, manualTransitions, type Order, type OrderStatus } from "@/domain/order";

import { referenceNow } from "./config";
import type { ActionResult } from "./types";

const delay = (ms = 450) => new Promise((resolve) => setTimeout(resolve, ms));

const STATUS_TITLE: Record<OrderStatus, string> = {
  awaiting_payment: "To‘lov kutilmoqda",
  processing: "Jarayonda",
  handed_to_courier: "Kuryerga topshirildi",
  delivered: "Yetkazildi",
  cancelled: "Bekor qilindi",
};

export async function cancelOrder(order: Order, reason: string): Promise<ActionResult<Order>> {
  await delay();
  const trimmed = reason.trim();
  if (trimmed.length < 3) {
    return {
      ok: false,
      error: "Sababni kiriting.",
      fieldErrors: { reason: "Kamida 3 ta belgi kiriting." },
    };
  }
  if (!canCancel(order)) {
    return { ok: false, error: "Bu buyurtmani bekor qilib bo‘lmaydi." };
  }
  const paid = order.payment.status === "paid";
  const reversals = order.cashback
    .filter((e) => e.kind !== "reversal")
    .map((e) => ({ kind: "reversal" as const, amount: -e.amount, label: "Qarama-qarshi yozuv" }));
  return {
    ok: true,
    data: {
      ...order,
      status: "cancelled",
      payment: { ...order.payment, status: paid ? "refunded" : order.payment.status },
      cancellation: { reason: "admin", note: trimmed },
      cashback: [...order.cashback, ...reversals],
      history: [
        {
          at: referenceNow().toISOString(),
          title: STATUS_TITLE.cancelled,
          source: "admin",
          status: "cancelled",
          note: paid
            ? `Administrator · to‘lov qaytarish so‘rovi yuborildi, cashback yozuvlari qaytarildi · ${trimmed}`
            : `Administrator · ${trimmed}`,
        },
        ...order.history,
      ],
    },
  };
}

export async function changeOrderStatus(
  order: Order,
  status: OrderStatus,
): Promise<ActionResult<Order>> {
  await delay();
  if (!manualTransitions(order).includes(status)) {
    return { ok: false, error: "Bu holatga o‘tib bo‘lmaydi." };
  }
  return {
    ok: true,
    data: {
      ...order,
      status,
      history: [
        {
          at: referenceNow().toISOString(),
          title: STATUS_TITLE[status],
          source: "admin",
          status,
          note: "Administrator · holat qo‘lda o‘zgartirildi · mijozga push yuborildi",
        },
        ...order.history,
      ],
    },
  };
}

/** Retry the BTS hand-off after an automatic attempt failed. */
export async function retryShipment(order: Order): Promise<ActionResult<Order>> {
  await delay(700);
  if (order.shipment.state !== "failed") {
    return { ok: false, error: "BTS buyurtmasi allaqachon yaratilgan." };
  }
  const trackingNumber = String(48_214_000 + (order.id % 1000));
  const at = referenceNow().toISOString();
  return {
    ok: true,
    data: {
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
    },
  };
}
