import { OPEN_REFUND_STATES, refundOperations, type PaymentRecord } from "@/domain/payment";

import { referenceNow } from "../config";
import type { ActionResult } from "../types";
import { delay } from "./delay";
import { paymentById } from "./payments";

/**
 * Mock implementation of `src/data/payments.actions.ts`: the refund
 * operations of §2.12 over the fixtures, with the contract's 404 and 409
 * answers. Nothing is persisted.
 */

const NOT_FOUND: ActionResult<never> = { ok: false, error: "Topilmadi.", code: "not_found" };

function lookup(paymentId: number, refundId: number) {
  const payment = paymentById(paymentId);
  const refund = payment?.refunds.find((r) => r.id === refundId);
  return payment && refund ? { payment, refund } : null;
}

export async function retryRefund(
  paymentId: number,
  refundId: number,
): Promise<ActionResult<PaymentRecord>> {
  await delay(450);
  const found = lookup(paymentId, refundId);
  if (!found) return NOT_FOUND;
  const { payment, refund } = found;
  if (!refundOperations(refund, payment).retry) {
    return {
      ok: false,
      error: "Bu qaytarishni qayta yuborib bo‘lmaydi.",
      code: "invalid_transition",
    };
  }
  if (payment.refunds.some((r) => OPEN_REFUND_STATES.includes(r.state))) {
    return {
      ok: false,
      error: "Bu to‘lov uchun qaytarish allaqachon jarayonda.",
      code: "conflict",
    };
  }
  const at = referenceNow().toISOString();
  return {
    ok: true,
    data: {
      ...payment,
      refunds: [
        {
          id: refund.id + 500_000,
          state: payment.provider === "click" ? "requested" : "manual_required",
          provider: payment.provider,
          amount: refund.amount,
          requestedAt: at,
          updatedAt: at,
        },
        ...payment.refunds,
      ],
    },
  };
}

export async function resolveRefund(
  paymentId: number,
  refundId: number,
  state: "succeeded" | "failed",
): Promise<ActionResult<PaymentRecord>> {
  await delay(450);
  const found = lookup(paymentId, refundId);
  if (!found) return NOT_FOUND;
  const { payment, refund } = found;
  if (!refundOperations(refund, payment).resolve) {
    return { ok: false, error: "Bu qaytarishni yakunlab bo‘lmaydi.", code: "invalid_transition" };
  }
  const at = referenceNow().toISOString();
  const refunds = payment.refunds.map((r) =>
    r.id === refund.id
      ? { ...r, state, updatedAt: at, completedAt: state === "succeeded" ? at : undefined }
      : r,
  );
  const refunded = refunds
    .filter((r) => r.state === "succeeded")
    .reduce((sum, r) => sum + r.amount, 0);
  return {
    ok: true,
    data: { ...payment, refunds, status: refunded >= payment.amount ? "refunded" : payment.status },
  };
}
