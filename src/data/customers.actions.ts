"use server";

import { z } from "zod";

import type { LedgerEntry } from "@/domain/cashback";
import type { CustomerSession } from "@/domain/customer";

import {
  apiMutation,
  fieldErrorsFrom,
  guardAction,
  idempotencyKeySchema,
  sessionToken,
} from "./action-guard";
import { apiAdjustCashback, apiRevokeCustomerSession } from "./api/customers";
import { isApiError } from "./api/errors";
import { mapLedgerEntry } from "./api/mappers/customers";
import { toActionResult } from "./api/mappers/errors";
import * as mock from "./mock/customers.actions";
import { listCustomerSessions } from "./customers";
import { dataSource } from "./source";
import type { ActionResult, Page } from "./types";

/**
 * Customer mutations (contract §2.6, §7.10). The mock body lives in
 * `./mock/customers.actions.ts`; the api branch posts to
 * `customers/{id}/cashback-adjustments/` with the dialog's `Idempotency-Key`
 * and returns `{ entry, balance, available }`. Field errors come back on the
 * dialog's names (`amount`, `reason`, `direction`); the backend's
 * `insufficient_balance` arrives on `amount` ("Balansdan ko‘p ayirib
 * bo‘lmaydi.") with the top-level "Balans manfiy bo‘lib qoladi.".
 */

export interface CashbackAdjustmentInput {
  direction: "add" | "subtract";
  amount: number;
  reason: string;
}

export interface CashbackAdjustment {
  entry: LedgerEntry;
  /** Balance after the entry, from the server; absent in mock mode. */
  balance?: number;
  /** Available balance after the entry (balance − holds), from the server. */
  available?: number;
}

const adjustmentSchema = z.object({
  customerId: z.string().trim().min(1).max(64),
  input: z.object({
    direction: z.enum(["add", "subtract"], { error: "Amalni tanlang." }),
    amount: z
      .number({ error: "Summani kiriting." })
      .int("Summani kiriting.")
      .min(1, "Summani kiriting.")
      .max(10_000_000, "Summa juda katta."),
    reason: z
      .string({ error: "Kamida 3 ta belgi kiriting." })
      .trim()
      .min(3, "Kamida 3 ta belgi kiriting.")
      .max(300, "300 belgidan oshmasin."),
  }),
  key: idempotencyKeySchema,
});

export async function adjustCashback(
  customerId: string,
  input: CashbackAdjustmentInput,
  key: string,
  csrf: string,
): Promise<ActionResult<CashbackAdjustment>> {
  const guard = await guardAction(csrf);
  if (!guard.ok) return guard;
  const parsed = adjustmentSchema.safeParse({ customerId, input, key });
  if (!parsed.success) {
    const failure = fieldErrorsFrom(parsed.error);
    // The dialog shows field errors under `amount` / `reason` (not `input.amount`).
    failure.fieldErrors = Object.fromEntries(
      Object.entries(failure.fieldErrors ?? {}).map(([path, message]) => [
        path.replace(/^input\./, ""),
        message,
      ]),
    );
    return failure;
  }
  const { customerId: id, input: values } = parsed.data;
  if ((await dataSource()) === "api") {
    if (!/^\d{1,18}$/.test(id)) return { ok: false, error: "Mijoz topilmadi.", code: "not_found" };
    return apiMutation("adjustCashback", async () => {
      try {
        const { data } = await apiAdjustCashback(
          sessionToken(guard.session),
          id,
          { direction: values.direction, amount: values.amount, reason: values.reason },
          parsed.data.key,
        );
        return {
          ok: true,
          data: {
            entry: mapLedgerEntry(data.entry),
            balance: data.balance,
            available: data.available,
          },
        };
      } catch (error) {
        return toActionResult(error);
      }
    });
  }
  return mock.adjustCashback(id, values);
}

/* --- «Faol seanslar» (contract §2.6, B-W1) --- */

const customerIdSchema = z.string().trim().min(1).max(64);
const pageSchema = z.number().int().min(1).max(100_000);
const sessionIdSchema = z.uuid();

const SESSION_NOT_FOUND_MESSAGE = "Seans allaqachon tugagan yoki topilmadi.";

/** One page of the customer's open sessions (a read: no refresh, no key). */
export async function loadCustomerSessions(
  customerId: string,
  page: number,
  csrf: string,
): Promise<ActionResult<Page<CustomerSession>>> {
  const guard = await guardAction(csrf);
  if (!guard.ok) return guard;
  const parsed = z
    .object({ customerId: customerIdSchema, page: pageSchema })
    .safeParse({ customerId, page });
  if (!parsed.success) return { ok: false, error: "Mijoz topilmadi.", code: "not_found" };
  try {
    const token = guard.session.mode === "api" ? sessionToken(guard.session) : undefined;
    const sessions = await listCustomerSessions(parsed.data.customerId, parsed.data.page, token);
    if (!sessions) return { ok: false, error: "Mijoz topilmadi.", code: "not_found" };
    return { ok: true, data: sessions };
  } catch (error) {
    return toActionResult(error);
  }
}

/** The page without `sid` (a re-read that raced the sign-out, or the demo's fixed data). */
function withoutSession(page: Page<CustomerSession>, sid: string): Page<CustomerSession> {
  const items = page.items.filter((row) => row.id !== sid);
  if (items.length === page.items.length) return page;
  return { ...page, items, total: Math.max(0, page.total - 1) };
}

export interface RevokedSession {
  /** The page the card showed, read again after the sign-out. */
  sessions: Page<CustomerSession>;
  /** `false` when the session had already ended (404): nothing was revoked now. */
  revoked: boolean;
}

/**
 * `DELETE customers/{id}/sessions/{sid}/` (B-W1, keyed): signs that phone
 * or browser out (audit `customer.session_revoked`, actor the staff
 * member) and returns the same page read again. A session that already
 * ended answers `revoked: false` with the fresh page, so the row goes away
 * either way.
 */
export async function revokeCustomerSession(
  customerId: string,
  sessionId: string,
  page: number,
  key: string,
  csrf: string,
): Promise<ActionResult<RevokedSession>> {
  const guard = await guardAction(csrf);
  if (!guard.ok) return guard;
  const parsed = z
    .object({
      customerId: customerIdSchema,
      sessionId: sessionIdSchema,
      page: pageSchema,
      key: idempotencyKeySchema,
    })
    .safeParse({ customerId, sessionId, page, key });
  if (!parsed.success) return { ok: false, error: SESSION_NOT_FOUND_MESSAGE, code: "not_found" };
  const { customerId: id, sessionId: sid } = parsed.data;
  const reread = async (token: string | undefined, revoked: boolean) => {
    const sessions = await listCustomerSessions(id, parsed.data.page, token);
    if (!sessions) return { ok: false as const, error: "Mijoz topilmadi.", code: "not_found" };
    return {
      ok: true as const,
      data: {
        sessions: withoutSession(sessions, sid),
        revoked,
      },
    };
  };
  if ((await dataSource()) === "api") {
    if (!/^\d{1,18}$/.test(id)) return { ok: false, error: "Mijoz topilmadi.", code: "not_found" };
    return apiMutation("revokeCustomerSession", async () => {
      const token = sessionToken(guard.session);
      try {
        await apiRevokeCustomerSession(token, id, sid, parsed.data.key);
        return await reread(token, true);
      } catch (error) {
        if (isApiError(error) && error.status === 404) {
          try {
            return await reread(token, false);
          } catch (inner) {
            return toActionResult(inner);
          }
        }
        return toActionResult(error);
      }
    });
  }
  const known = await mock.hasCustomerSession(id, sid);
  if (known === null) return { ok: false, error: "Mijoz topilmadi.", code: "not_found" };
  return reread(undefined, known);
}
