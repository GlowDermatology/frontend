"use server";

import { z } from "zod";

import { orderDataCopy, orderLabelsCopy } from "@/domain/copy/orders";
import { DELIVERY_METHODS, ORDER_STATUSES, type Order, type OrderStatus } from "@/domain/order";
import {
  APPROVED_PRICE_MAX,
  PARCEL_WEIGHT_MAX_G,
  PARCEL_WEIGHT_MIN_G,
  RETURN_NOTE_MAX,
  type DispatchInput,
} from "@/domain/order-dispatch";

import { getAdminLocale } from "@/lib/i18n/admin-locale";
import { localized } from "@/lib/i18n/localized";
import { validationCopy } from "@/lib/i18n/validation-copy";

import { apiMutation, fieldErrorsFrom, guardAction, sessionToken } from "./action-guard";
import {
  apiCancelOrder,
  apiConfirmReturn,
  apiDispatchOrder,
  apiGetOrderFresh,
  apiRetryShipment,
  apiTransitionOrder,
} from "./api/orders";
import { toActionResult } from "./api/mappers/errors";
import {
  confirmReturnBody,
  dispatchBody,
  mapOrder,
  type MapOrderOptions,
} from "./api/mappers/orders";
import { optimizableMediaUrl } from "./api/media";
import * as mock from "./mock/orders.actions";
import * as mockQueries from "./mock/orders.queries";
import { dataSource } from "./source";
import type { ActionResult } from "./types";

/**
 * Order mutations (spec "Frontend wiring › Server Actions", contract §2.2).
 * Signature convention: ids + the change + the client's idempotency key +
 * the `gd_csrf` double-submit token. Every action re-verifies the session,
 * re-validates its input with zod and dispatches on `dataSource()`: the mock
 * bodies live in `./mock/orders.actions.ts`; the api branch posts
 * `orders/{id}/cancel|transition|retry-shipment|dispatch|confirm-return/`
 * with the dialog's `Idempotency-Key` (required) and maps the `Order` it
 * answers. Refusals come back with the backend's code and message: 409
 * `not_cancellable` (incl. the BTS refusal text and the Yandex cases),
 * `return_requested` (Yandex asked to bring the parcel back, the order is
 * unchanged), `invalid_transition`, `conflict` (busy order, BTS message in
 * flight, another Yandex operation, purchase conflict), the dispatch codes
 * (`coordinates_required`, `method_disabled`, `too_heavy`, the warehouse
 * calendar's `not_configured|suspended|closed|after_cutoff|
 * returns_unavailable`), 503 `provider_unavailable` (safe to retry with the
 * same key); a field error stays on the dialog's field.
 */

const orderIdSchema = z.int().positive();

const MAP_OPTIONS: MapOrderOptions = { imageUrl: optimizableMediaUrl };

/**
 * The actions' input rules with the backend's limits; messages in the admin language
 * (`validationCopy` + `orderDataCopy`, Uzbek = the backend's texts).
 */
const orderActionSchemas = localized((locale) => {
  const v = validationCopy[locale];
  const m = orderDataCopy[locale];
  const w = orderLabelsCopy[locale].weight;
  const key = z.uuid({ error: v.requestKey });
  return {
    cancel: z.object({
      orderId: orderIdSchema,
      reason: z.string().trim().min(3, v.minChars(3)).max(500, v.maxChars(500)),
      key,
    }),
    transition: z.object({ orderId: orderIdSchema, status: z.enum(ORDER_STATUSES), key }),
    retry: z.object({ orderId: orderIdSchema, key }),
    /** `DispatchRequest` (INTERFACES-dispatch). */
    dispatch: z.object({
      orderId: orderIdSchema,
      contentsVerified: z.literal(true, { error: m.confirmContents }),
      weightG: z
        .int({ error: w.integer })
        .min(PARCEL_WEIGHT_MIN_G, w.min(String(PARCEL_WEIGHT_MIN_G)))
        .max(PARCEL_WEIGHT_MAX_G, w.max),
      method: z.enum(DELIVERY_METHODS).nullish(),
      approvedPrice: z
        .int({ error: v.invalid })
        .min(0, v.invalid)
        .max(APPROVED_PRICE_MAX, v.invalid)
        .nullish(),
      key,
    }),
    confirmReturn: z.object({
      orderId: orderIdSchema,
      note: z.string().trim().max(RETURN_NOTE_MAX, v.maxChars(RETURN_NOTE_MAX)),
      key,
    }),
  };
});

/** The admin language of this request, its messages and its rules. */
async function requestLanguage() {
  const locale = await getAdminLocale();
  return {
    locale,
    m: orderDataCopy[locale],
    schemas: orderActionSchemas[locale],
    map: { ...MAP_OPTIONS, locale } satisfies MapOrderOptions,
  };
}

export async function cancelOrder(
  orderId: number,
  reason: string,
  key: string,
  csrf: string,
): Promise<ActionResult<Order>> {
  const guard = await guardAction(csrf);
  if (!guard.ok) return guard;
  const { locale, m, schemas, map } = await requestLanguage();
  const parsed = schemas.cancel.safeParse({ orderId, reason, key });
  if (!parsed.success) return fieldErrorsFrom(parsed.error, m.enterReason);
  const input = parsed.data;
  if ((await dataSource()) === "api") {
    return apiMutation("cancelOrder", async () => {
      try {
        const { data } = await apiCancelOrder(
          sessionToken(guard.session),
          input.orderId,
          { reason: input.reason },
          input.key,
        );
        return { ok: true, data: mapOrder(data, map) };
      } catch (error) {
        return toActionResult(error);
      }
    });
  }
  return mock.cancelOrder(input.orderId, input.reason, locale);
}

export async function changeOrderStatus(
  orderId: number,
  status: OrderStatus,
  key: string,
  csrf: string,
): Promise<ActionResult<Order>> {
  const guard = await guardAction(csrf);
  if (!guard.ok) return guard;
  const { locale, m, schemas, map } = await requestLanguage();
  const parsed = schemas.transition.safeParse({ orderId, status, key });
  if (!parsed.success) return fieldErrorsFrom(parsed.error, m.checkFields);
  const input = parsed.data;
  if ((await dataSource()) === "api") {
    return apiMutation("changeOrderStatus", async () => {
      try {
        const { data } = await apiTransitionOrder(
          sessionToken(guard.session),
          input.orderId,
          { status: input.status },
          input.key,
        );
        return { ok: true, data: mapOrder(data, map) };
      } catch (error) {
        return toActionResult(error);
      }
    });
  }
  return mock.changeOrderStatus(input.orderId, input.status, locale);
}

/**
 * Retry the BTS hand-off after an automatic attempt failed. The API answers
 * 202 with `shipment.pending = true`; the view then polls `loadOrder` until
 * the outcome (`created`, or `failed` again) arrives.
 */
export async function retryShipment(
  orderId: number,
  key: string,
  csrf: string,
): Promise<ActionResult<Order>> {
  const guard = await guardAction(csrf);
  if (!guard.ok) return guard;
  const { locale, m, schemas, map } = await requestLanguage();
  const parsed = schemas.retry.safeParse({ orderId, key });
  if (!parsed.success) return fieldErrorsFrom(parsed.error, m.checkFields);
  const input = parsed.data;
  if ((await dataSource()) === "api") {
    return apiMutation("retryShipment", async () => {
      try {
        const { data } = await apiRetryShipment(
          sessionToken(guard.session),
          input.orderId,
          input.key,
        );
        return { ok: true, data: mapOrder(data, map) };
      } catch (error) {
        return toActionResult(error);
      }
    });
  }
  return mock.retryShipment(input.orderId, locale);
}

/**
 * "Kuryer chaqirish" (Yandex Delivery plan §3.6): staff checked the contents
 * and weighed the parcel. The API answers 202 with the order at stage
 * `courier_requested` (the outbox calls Yandex); the view then polls
 * `loadOrder` every 10 s for up to 3 minutes. `approvedPrice` approves the
 * offer of an open `dispatch_review`; `method` switches the method (the paid
 * fee never changes).
 */
export async function dispatchOrder(
  orderId: number,
  input: DispatchInput,
  key: string,
  csrf: string,
): Promise<ActionResult<Order>> {
  const guard = await guardAction(csrf);
  if (!guard.ok) return guard;
  const { locale, m, schemas, map } = await requestLanguage();
  const parsed = schemas.dispatch.safeParse({ orderId, key, ...input });
  if (!parsed.success) return fieldErrorsFrom(parsed.error, m.checkFields);
  const { orderId: id, key: idempotencyKey, ...body } = parsed.data;
  if ((await dataSource()) === "api") {
    return apiMutation("dispatchOrder", async () => {
      try {
        const { data } = await apiDispatchOrder(
          sessionToken(guard.session),
          id,
          dispatchBody(body),
          idempotencyKey,
        );
        return { ok: true, data: mapOrder(data, map) };
      } catch (error) {
        return toActionResult(error);
      }
    });
  }
  return mock.dispatchOrder(id, body, locale);
}

/**
 * Staff confirm that a returning / returned Yandex parcel is physically back
 * (plan §3.8): stage `returned`, the open `return_pending` issue resolved
 * with the optional note. The order status does not change.
 */
export async function confirmOrderReturn(
  orderId: number,
  note: string,
  key: string,
  csrf: string,
): Promise<ActionResult<Order>> {
  const guard = await guardAction(csrf);
  if (!guard.ok) return guard;
  const { locale, m, schemas, map } = await requestLanguage();
  const parsed = schemas.confirmReturn.safeParse({ orderId, note, key });
  if (!parsed.success) return fieldErrorsFrom(parsed.error, m.checkFields);
  const input = parsed.data;
  if ((await dataSource()) === "api") {
    return apiMutation("confirmOrderReturn", async () => {
      try {
        const { data } = await apiConfirmReturn(
          sessionToken(guard.session),
          input.orderId,
          confirmReturnBody(input.note),
          input.key,
        );
        return { ok: true, data: mapOrder(data, map) };
      } catch (error) {
        return toActionResult(error);
      }
    });
  }
  return mock.confirmReturn(input.orderId, input.note, locale);
}

/**
 * A fresh read of one order for the BTS-retry and courier-dispatch polls (no
 * key, no refresh: it changes nothing). Guarded like the mutations, since a Server Action is a
 * public endpoint.
 */
export async function loadOrder(orderId: number, csrf: string): Promise<ActionResult<Order>> {
  const guard = await guardAction(csrf);
  if (!guard.ok) return guard;
  const { locale, m, map } = await requestLanguage();
  const parsed = orderIdSchema.safeParse(orderId);
  if (!parsed.success) return { ok: false, error: m.notFound, code: "not_found" };
  if ((await dataSource()) === "api") {
    try {
      const { data } = await apiGetOrderFresh(sessionToken(guard.session), parsed.data);
      return { ok: true, data: mapOrder(data, map) };
    } catch (error) {
      return toActionResult(error);
    }
  }
  const order = await mockQueries.getOrder(parsed.data, locale);
  return order ? { ok: true, data: order } : { ok: false, error: m.notFound, code: "not_found" };
}
