"use server";

import { z } from "zod";

import { ORDER_STATUSES, type Order, type OrderStatus } from "@/domain/order";

import { apiMutation, fieldErrorsFrom, guardAction, idempotencyKeySchema } from "./action-guard";
import * as mock from "./mock/orders.actions";
import { dataSource } from "./source";
import type { ActionResult } from "./types";

/**
 * Order mutations (spec "Frontend wiring › Server Actions", contract §2.2).
 * Signature convention: ids + the change + the client's idempotency key +
 * the `gd_csrf` double-submit token. Every action re-verifies the session,
 * re-validates its input with zod and dispatches on `dataSource()`: the mock
 * bodies live in `./mock/orders.actions.ts`; the api branch (F2) will call
 * `POST orders/{id}/cancel|transition|retry-shipment/` with `Idempotency-Key`.
 */

const orderIdSchema = z.int().positive();

const cancelSchema = z.object({
  orderId: orderIdSchema,
  reason: z
    .string()
    .trim()
    .min(3, "Kamida 3 ta belgi kiriting.")
    .max(500, "500 belgidan oshmasin."),
  key: idempotencyKeySchema,
});

const transitionSchema = z.object({
  orderId: orderIdSchema,
  status: z.enum(ORDER_STATUSES),
  key: idempotencyKeySchema,
});

const retrySchema = z.object({ orderId: orderIdSchema, key: idempotencyKeySchema });

export async function cancelOrder(
  orderId: number,
  reason: string,
  key: string,
  csrf: string,
): Promise<ActionResult<Order>> {
  const guard = await guardAction(csrf);
  if (!guard.ok) return guard;
  const parsed = cancelSchema.safeParse({ orderId, reason, key });
  if (!parsed.success) return fieldErrorsFrom(parsed.error, "Sababni kiriting.");
  if ((await dataSource()) === "api") return apiMutation("cancelOrder");
  return mock.cancelOrder(parsed.data.orderId, parsed.data.reason);
}

export async function changeOrderStatus(
  orderId: number,
  status: OrderStatus,
  key: string,
  csrf: string,
): Promise<ActionResult<Order>> {
  const guard = await guardAction(csrf);
  if (!guard.ok) return guard;
  const parsed = transitionSchema.safeParse({ orderId, status, key });
  if (!parsed.success) return fieldErrorsFrom(parsed.error);
  if ((await dataSource()) === "api") return apiMutation("changeOrderStatus");
  return mock.changeOrderStatus(parsed.data.orderId, parsed.data.status);
}

/** Retry the BTS hand-off after an automatic attempt failed. */
export async function retryShipment(
  orderId: number,
  key: string,
  csrf: string,
): Promise<ActionResult<Order>> {
  const guard = await guardAction(csrf);
  if (!guard.ok) return guard;
  const parsed = retrySchema.safeParse({ orderId, key });
  if (!parsed.success) return fieldErrorsFrom(parsed.error);
  if ((await dataSource()) === "api") return apiMutation("retryShipment");
  return mock.retryShipment(parsed.data.orderId);
}
