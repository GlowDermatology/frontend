"use server";

import { z } from "zod";

import type { PaymentRecord } from "@/domain/payment";

import {
  apiMutation,
  fieldErrorsFrom,
  guardAction,
  idempotencyKeySchema,
  sessionToken,
} from "./action-guard";
import { apiResolveRefund, apiRetryRefund } from "./api/orders";
import { toActionResult } from "./api/mappers/errors";
import { mapPayment } from "./api/mappers/payments";
import * as mock from "./mock/payments.actions";
import { dataSource } from "./source";
import type { ActionResult } from "./types";

/**
 * Refund operations of the payments screen (contract §2.12, §7 item 18):
 * `POST payments/{id}/refunds/{refund_id}/retry/` (a failed refund becomes a
 * new refund of the payment), `…/resolve/` `{state}` (an unknown or
 * manual_required refund closed by hand) and `…/resolve/` `{state:
 * "succeeded", manual_payout}` (a failed Click refund closed after the
 * server's fresh Click status check, M2). All answer 200 with the payment
 * row; the key is optional on the API but always sent, one per confirmation
 * dialog. 409 `invalid_transition` / `conflict` (also the busy-order answer)
 * and 503 `provider_unavailable` (Click did not answer the status check)
 * come back with the backend's code and message.
 */

const idSchema = z.int().positive();

const retrySchema = z.object({
  paymentId: idSchema,
  refundId: idSchema,
  key: idempotencyKeySchema,
});
const resolveSchema = retrySchema.extend({ state: z.enum(["succeeded", "failed"]) });
const closeSchema = retrySchema.extend({ manualPayout: z.boolean() });

export async function retryRefund(
  paymentId: number,
  refundId: number,
  key: string,
  csrf: string,
): Promise<ActionResult<PaymentRecord>> {
  const guard = await guardAction(csrf);
  if (!guard.ok) return guard;
  const parsed = retrySchema.safeParse({ paymentId, refundId, key });
  if (!parsed.success) return fieldErrorsFrom(parsed.error);
  const input = parsed.data;
  if ((await dataSource()) === "api") {
    return apiMutation("retryRefund", async () => {
      try {
        const { data } = await apiRetryRefund(
          sessionToken(guard.session),
          input.paymentId,
          input.refundId,
          input.key,
        );
        return { ok: true, data: mapPayment(data) };
      } catch (error) {
        return toActionResult(error);
      }
    });
  }
  return mock.retryRefund(input.paymentId, input.refundId);
}

export async function resolveRefund(
  paymentId: number,
  refundId: number,
  state: "succeeded" | "failed",
  key: string,
  csrf: string,
): Promise<ActionResult<PaymentRecord>> {
  const guard = await guardAction(csrf);
  if (!guard.ok) return guard;
  const parsed = resolveSchema.safeParse({ paymentId, refundId, state, key });
  if (!parsed.success) return fieldErrorsFrom(parsed.error);
  const input = parsed.data;
  if ((await dataSource()) === "api") {
    return apiMutation("resolveRefund", async () => {
      try {
        const { data } = await apiResolveRefund(
          sessionToken(guard.session),
          input.paymentId,
          input.refundId,
          { state: input.state },
          input.key,
        );
        return { ok: true, data: mapPayment(data) };
      } catch (error) {
        return toActionResult(error);
      }
    });
  }
  return mock.resolveRefund(input.paymentId, input.refundId, input.state);
}

/**
 * Closes a failed Click refund as succeeded (§7 item 18, M2): the server asks
 * Click first. Click reversed the payment → closed (nothing to pay out);
 * Click still reports it paid → 409 `invalid_transition` with
 * `CLICK_STILL_PAID_MESSAGE` (its own code `click_not_reversed` once the
 * backend sends one) unless `manualPayout` says staff paid the
 * customer outside Click; Click unreachable → 503 `provider_unavailable`. The
 * two steps send different bodies, so the board keeps a key per step.
 */
export async function closeFailedRefund(
  paymentId: number,
  refundId: number,
  manualPayout: boolean,
  key: string,
  csrf: string,
): Promise<ActionResult<PaymentRecord>> {
  const guard = await guardAction(csrf);
  if (!guard.ok) return guard;
  const parsed = closeSchema.safeParse({ paymentId, refundId, manualPayout, key });
  if (!parsed.success) return fieldErrorsFrom(parsed.error);
  const input = parsed.data;
  if ((await dataSource()) === "api") {
    return apiMutation("closeFailedRefund", async () => {
      try {
        const { data } = await apiResolveRefund(
          sessionToken(guard.session),
          input.paymentId,
          input.refundId,
          { state: "succeeded", manual_payout: input.manualPayout },
          input.key,
        );
        return { ok: true, data: mapPayment(data) };
      } catch (error) {
        return toActionResult(error);
      }
    });
  }
  return mock.closeFailedRefund(input.paymentId, input.refundId, input.manualPayout);
}
