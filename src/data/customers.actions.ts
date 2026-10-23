/**
 * Customer mutations used by the admin customer card.
 *
 * Demo mode: validates and returns the new ledger entry after a short delay;
 * nothing is persisted. With the API this becomes a Server Action posting to
 * `POST /api/v1/admin/customers/{id}/cashback-adjustments/` (the backend
 * appends an immutable `adjustment` entry and records the admin and reason).
 */
import type { LedgerEntry } from "@/domain/cashback";

import { referenceNow } from "./config";
import type { ActionResult } from "./types";

export interface CashbackAdjustmentInput {
  direction: "add" | "subtract";
  amount: number;
  reason: string;
}

const delay = (ms = 500) => new Promise((resolve) => setTimeout(resolve, ms));

export async function adjustCashback(
  currentBalance: number,
  input: CashbackAdjustmentInput,
): Promise<ActionResult<LedgerEntry>> {
  await delay();
  const reason = input.reason.trim();
  const signed = input.direction === "add" ? input.amount : -input.amount;
  if (!Number.isInteger(input.amount) || input.amount <= 0) {
    return { ok: false, error: "Summani kiriting.", fieldErrors: { amount: "Summani kiriting." } };
  }
  if (reason.length < 3) {
    return {
      ok: false,
      error: "Sababni kiriting.",
      fieldErrors: { reason: "Kamida 3 ta belgi kiriting." },
    };
  }
  if (currentBalance + signed < 0) {
    return {
      ok: false,
      error: "Balans manfiy bo‘lib qoladi.",
      fieldErrors: { amount: "Balansdan ko‘p ayirib bo‘lmaydi." },
    };
  }
  return {
    ok: true,
    data: {
      id: `adj-${crypto.randomUUID()}`,
      at: referenceNow().toISOString(),
      kind: "adjustment",
      source: "Administrator",
      note: reason,
      amount: signed,
    },
  };
}
