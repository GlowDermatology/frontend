import {
  canCloseFailedRefund,
  CLICK_STILL_PAID_MESSAGE,
  hasOpenRefund,
  refundOperations,
  type PaymentRecord,
} from "@/domain/payment";

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
const NOT_RESOLVABLE = "Bu qaytarishni yakunlab bo‘lmaydi.";

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
  // The contract's order: a refund that cannot be retried at all is
  // `invalid_transition`; a retriable one blocked by an open sibling is `conflict`.
  if (refund.state !== "failed" || payment.status !== "paid") {
    return {
      ok: false,
      error: "Bu qaytarishni qayta yuborib bo‘lmaydi.",
      code: "invalid_transition",
    };
  }
  if (hasOpenRefund(payment)) {
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
          ...(payment.provider === "payme" ? { manualReason: "payme" as const } : {}),
        },
        ...payment.refunds,
      ],
    },
  };
}

/** The payment with `refundId` settled at `at` (`refunded` once the succeeded refunds cover it). */
function settle(
  payment: PaymentRecord,
  refundId: number,
  state: "succeeded" | "failed",
): PaymentRecord {
  const at = referenceNow().toISOString();
  const refunds = payment.refunds.map((r) =>
    r.id === refundId
      ? { ...r, state, updatedAt: at, completedAt: state === "succeeded" ? at : undefined }
      : r,
  );
  const refunded = refunds
    .filter((r) => r.state === "succeeded")
    .reduce((sum, r) => sum + r.amount, 0);
  return { ...payment, refunds, status: refunded >= payment.amount ? "refunded" : payment.status };
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
    return { ok: false, error: NOT_RESOLVABLE, code: "invalid_transition" };
  }
  return { ok: true, data: settle(payment, refund.id, state) };
}

/**
 * The demo's Click never reversed the failed refund: closing it without
 * `manualPayout` answers the backend's 409, and the payout closes it, so
 * both steps of the board's flow can be tried (§7 item 18).
 */
export async function closeFailedRefund(
  paymentId: number,
  refundId: number,
  manualPayout: boolean,
): Promise<ActionResult<PaymentRecord>> {
  await delay(450);
  const found = lookup(paymentId, refundId);
  if (!found) return NOT_FOUND;
  const { payment, refund } = found;
  if (refund.state !== "failed" || !canCloseFailedRefund(refund, payment)) {
    return { ok: false, error: NOT_RESOLVABLE, code: "invalid_transition" };
  }
  if (!manualPayout) {
    return { ok: false, error: CLICK_STILL_PAID_MESSAGE, code: "invalid_transition" };
  }
  return { ok: true, data: settle(payment, refund.id, "succeeded") };
}
