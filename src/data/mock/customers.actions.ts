import { ledgerBalance, type LedgerEntry } from "@/domain/cashback";

import { referenceNow } from "../config";
import type { CashbackAdjustmentInput } from "../customers.actions";
import type { ActionResult } from "../types";
import { getCustomer } from "./customers.queries";

/**
 * Mock implementation of `src/data/customers.actions.ts`: the customer is
 * looked up by id and the balance comes from the fixture ledger, never from
 * the client. Returns the new entry only — the demo has no authoritative
 * server balance, so the card keeps deriving it from the ledger rows.
 */

const delay = (ms = 500) => new Promise((resolve) => setTimeout(resolve, ms));

export async function adjustCashback(
  customerId: string,
  input: CashbackAdjustmentInput,
): Promise<ActionResult<{ entry: LedgerEntry; balance?: number }>> {
  await delay();
  const customer = await getCustomer(customerId);
  if (!customer) return { ok: false, error: "Mijoz topilmadi.", code: "not_found" };
  const balance = ledgerBalance(customer.ledger);
  const signed = input.direction === "add" ? input.amount : -input.amount;
  if (balance + signed < 0) {
    return {
      ok: false,
      error: "Balans manfiy bo‘lib qoladi.",
      fieldErrors: { amount: "Balansdan ko‘p ayirib bo‘lmaydi." },
    };
  }
  return {
    ok: true,
    data: {
      entry: {
        id: `adj-${crypto.randomUUID()}`,
        at: referenceNow().toISOString(),
        kind: "adjustment",
        source: "Administrator",
        note: input.reason,
        amount: signed,
      },
    },
  };
}
