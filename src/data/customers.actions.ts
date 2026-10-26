"use server";

import { z } from "zod";

import type { LedgerEntry } from "@/domain/cashback";

import {
  apiMutation,
  fieldErrorsFrom,
  guardAction,
  idempotencyKeySchema,
  sessionToken,
} from "./action-guard";
import { apiAdjustCashback } from "./api/customers";
import { mapLedgerEntry } from "./api/mappers/customers";
import { toActionResult } from "./api/mappers/errors";
import * as mock from "./mock/customers.actions";
import { dataSource } from "./source";
import type { ActionResult } from "./types";

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
