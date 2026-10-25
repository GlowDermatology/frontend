"use server";

import { z } from "zod";

import type { LedgerEntry } from "@/domain/cashback";

import { apiMutation, fieldErrorsFrom, guardAction, idempotencyKeySchema } from "./action-guard";
import * as mock from "./mock/customers.actions";
import { dataSource } from "./source";
import type { ActionResult } from "./types";

/**
 * Customer mutations (contract §2.6, §7.10). The mock body lives in
 * `./mock/customers.actions.ts`; the api branch (F2) posts to
 * `customers/{id}/cashback-adjustments/` with `Idempotency-Key` and returns
 * `{ entry, balance }` — the card prefers the server balance when present.
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
}

const adjustmentSchema = z.object({
  customerId: z.string().trim().min(1).max(64),
  input: z.object({
    direction: z.enum(["add", "subtract"]),
    amount: z
      .number({ error: "Summani kiriting." })
      .int("Summani kiriting.")
      .min(1, "Summani kiriting.")
      .max(10_000_000, "Summa juda katta."),
    reason: z
      .string()
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
  if ((await dataSource()) === "api") return apiMutation("adjustCashback");
  return mock.adjustCashback(parsed.data.customerId, parsed.data.input);
}
