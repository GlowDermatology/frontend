import type { LedgerEntry } from "@/domain/cashback";

import { referenceNow } from "../config";
import type { CashbackAdjustmentInput } from "../customers.actions";
import type { ActionResult } from "../types";
import { delay } from "./delay";
import { getCustomer } from "./customers.queries";
import { mockCustomerSessions } from "./sessions";

/**
 * Mock implementation of `src/data/customers.actions.ts`: the customer is
 * looked up by id and the available balance comes from the fixture, never
 * from the client (a subtraction above it is refused like the backend's
 * `insufficient_balance`). Returns the new entry only — nothing is
 * persisted, so the card adds the entry to the balance it already shows.
 */

export async function adjustCashback(
  customerId: string,
  input: CashbackAdjustmentInput,
): Promise<ActionResult<{ entry: LedgerEntry; balance?: number }>> {
  await delay(500);
  const customer = await getCustomer(customerId);
  if (!customer) return { ok: false, error: "Mijoz topilmadi.", code: "not_found" };
  const signed = input.direction === "add" ? input.amount : -input.amount;
  if (input.direction === "subtract" && input.amount > customer.available) {
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

/**
 * Whether `sessionId` is one of the customer's open sessions in the
 * fixture (`null`: no such customer). Nothing is persisted: the card drops
 * the row itself, a reload shows it again.
 */
export async function hasCustomerSession(
  customerId: string,
  sessionId: string,
): Promise<boolean | null> {
  await delay(300);
  const customer = await getCustomer(customerId);
  if (!customer) return null;
  return mockCustomerSessions(customer).some((session) => session.id === sessionId);
}
