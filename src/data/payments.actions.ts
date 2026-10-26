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
 * Refund operations of the payments screen (contract §2.12):
 * `POST payments/{id}/refunds/{refund_id}/retry/` (a failed refund becomes a
 * new refund of the payment) and `…/resolve/` `{state}` (an unknown or
 * manual_required refund closed by hand). Both answer 200 with the payment
 * row; the key is optional on the API but always sent, one per confirmation
 * dialog. 409 `invalid_transition` / `conflict` (also the busy-order answer)
 * come back with the backend's message for the toast.
 */

const idSchema = z.int().positive();

const retrySchema = z.object({
  paymentId: idSchema,
  refundId: idSchema,
  key: idempotencyKeySchema,
});
const resolveSchema = retrySchema.extend({ state: z.enum(["succeeded", "failed"]) });

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
