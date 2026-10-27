import { refundNeedsAction, type PaymentListQuery, type PaymentRecord } from "@/domain/payment";
import { tashkentParts, toLocalIsoDate } from "@/lib/format";

import { referenceNow } from "../config";
import { paginate, type Page } from "../types";
import { PAYMENTS } from "./payments";

/**
 * Mock implementation of `src/data/payments.ts` over the fixtures, with the
 * API's filter semantics (§2.12: period and dates on `created_at`, search by
 * order id, transaction id or ≥3 phone digits; `refund_state=failed` leaves
 * out a failed refund a later succeeded one superseded, `refundNeedsAction`).
 */

function inPeriod(iso: string, period: PaymentListQuery["period"], now: Date): boolean {
  if (period === "all") return true;
  if (period === "today") return toLocalIsoDate(iso) === toLocalIsoDate(now);
  if (period === "week") {
    const age = now.getTime() - new Date(iso).getTime();
    return age >= 0 && age < 7 * 86_400_000;
  }
  const a = tashkentParts(iso);
  const b = tashkentParts(now);
  return a.year === b.year && a.month === b.month;
}

function matchesSearch(payment: PaymentRecord, q: string): boolean {
  const term = q.trim().toLowerCase();
  if (!term) return true;
  const digits = term.replace(/\D/g, "");
  return (
    String(payment.orderId).includes(term.replace(/^№/, "")) ||
    (payment.transactionId?.toLowerCase().includes(term) ?? false) ||
    (digits.length >= 3 && payment.customer.phone.includes(digits))
  );
}

export function filterPayments(
  query: Omit<PaymentListQuery, "page" | "pageSize">,
): PaymentRecord[] {
  const now = referenceNow();
  const rows = PAYMENTS.filter((p) => {
    if (!inPeriod(p.createdAt, query.period, now)) return false;
    if (query.dateFrom && toLocalIsoDate(p.createdAt) < query.dateFrom) return false;
    if (query.dateTo && toLocalIsoDate(p.createdAt) > query.dateTo) return false;
    if (query.status && p.status !== query.status) return false;
    if (query.provider && p.provider !== query.provider) return false;
    if (query.refund === "needs_action") {
      if (!p.refunds.some((r) => refundNeedsAction(r, p))) return false;
    } else if (query.refund === "failed") {
      // §2.12: only a failed refund that still needs staff (not a superseded one).
      if (!p.refunds.some((r) => r.state === "failed" && refundNeedsAction(r, p))) return false;
    } else if (query.refund && !p.refunds.some((r) => r.state === query.refund)) return false;
    return !query.q || matchesSearch(p, query.q);
  });
  return query.sort === "date_asc" ? rows.reverse() : rows;
}

export async function listPayments(query: PaymentListQuery): Promise<Page<PaymentRecord>> {
  return paginate(filterPayments(query), query.page, query.pageSize);
}
