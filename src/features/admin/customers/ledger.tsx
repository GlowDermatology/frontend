"use client";

import Link from "next/link";
import type { Route } from "next";

import { Badge, type Tone } from "@/components/ui/badge";
import { ScrollRegion } from "@/components/ui/scroll-region";
import {
  ledgerNoteText,
  ledgerSourceText,
  type LedgerEntry,
  type LedgerEntryKind,
} from "@/domain/cashback";
import type { CustomerPurchase } from "@/domain/customer";
import { useAdminLocale, useCopy } from "@/lib/i18n/admin-context";
import { useFormat } from "@/lib/i18n/admin-hooks";

import { customersCopy } from "./copy";

const KIND_TONE: Record<LedgerEntryKind, Tone> = {
  credit: "success",
  debit: "gold",
  adjustment: "neutral",
  reversal: "danger",
};

/** Order link of a ledger or purchase row. */
const orderLinkClass =
  "whitespace-nowrap text-ink underline decoration-line-strong underline-offset-4 hover:decoration-gold";

/**
 * The cashback ledger, newest first. BALANS is each entry's `balanceAfter`
 * (the server's own running total, contract §5.3); order entries link to the
 * order, and a credit names the policy version it was computed with. Sources
 * and notes are worded in the admin language from the row's structured origin;
 * an adjustment's reason is stored text and shown as written.
 */
export function LedgerTable({ rows }: { rows: ReadonlyArray<LedgerEntry> }) {
  const t = useCopy(customersCopy).ledger;
  const locale = useAdminLocale();
  const fmt = useFormat();
  return (
    <ScrollRegion label={t.label}>
      <table className="data-table min-w-[760px]">
        <caption className="sr-only">{t.caption}</caption>
        <thead className="uppercase">
          <tr>
            <th scope="col">{t.date}</th>
            <th scope="col">{t.kind}</th>
            <th scope="col">{t.source}</th>
            <th scope="col">{t.note}</th>
            <th scope="col" className="text-right!">
              {t.amount}
            </th>
            <th scope="col" className="text-right!">
              {t.balance}
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((entry) => {
            const source = ledgerSourceText(entry, locale);
            return (
              <tr key={entry.id}>
                <td className="whitespace-nowrap text-ink-muted! tabular-nums">
                  <time dateTime={entry.at}>{fmt.dateTimeShort(entry.at)}</time>
                </td>
                <td>
                  <Badge tone={KIND_TONE[entry.kind]}>{t.kinds[entry.kind]}</Badge>
                </td>
                <td className="max-w-[220px] break-words">
                  {entry.orderId !== undefined ? (
                    <Link
                      href={`/admin/orders/${entry.orderId}` as Route}
                      className={orderLinkClass}
                    >
                      {source}
                    </Link>
                  ) : (
                    source
                  )}
                </td>
                <td className="max-w-[320px] break-words text-ink-muted!">
                  {ledgerNoteText(entry, locale)}
                  {entry.kind === "credit" && entry.policyVersion !== undefined && (
                    <span
                      className="text-[12px] whitespace-nowrap"
                      title={t.policy(entry.policyVersion)}
                    >
                      {` · v${entry.policyVersion}`}
                    </span>
                  )}
                </td>
                <td className="text-right font-bold whitespace-nowrap tabular-nums">
                  {fmt.signed(entry.amount)}
                </td>
                <td className="text-right whitespace-nowrap tabular-nums">
                  {entry.balanceAfter === undefined ? "—" : fmt.number(entry.balanceAfter)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </ScrollRegion>
  );
}

export function PurchasesTable({ purchases }: { purchases: ReadonlyArray<CustomerPurchase> }) {
  const t = useCopy(customersCopy).purchases;
  const fmt = useFormat();
  return (
    <ScrollRegion label={t.label}>
      <table className="data-table min-w-[760px]">
        <caption className="sr-only">{t.caption}</caption>
        <thead className="uppercase">
          <tr>
            <th scope="col">{t.date}</th>
            <th scope="col">{t.source}</th>
            <th scope="col">{t.document}</th>
            <th scope="col" className="text-right!">
              {t.amount}
            </th>
            <th scope="col" className="text-right!">
              {t.promo}
            </th>
            <th scope="col" className="text-right!">
              {t.cashback}
            </th>
          </tr>
        </thead>
        <tbody>
          {purchases.map((purchase) => (
            <tr key={purchase.id}>
              <td className="whitespace-nowrap text-ink-muted! tabular-nums">
                <time dateTime={purchase.at}>{fmt.dateTimeShort(purchase.at)}</time>
              </td>
              <td>{purchase.source === "online" ? t.online : t.store}</td>
              <td className="tabular-nums">
                {purchase.orderId !== undefined ? (
                  <Link
                    href={`/admin/orders/${purchase.orderId}` as Route}
                    className={orderLinkClass}
                  >
                    {purchase.document}
                  </Link>
                ) : (
                  purchase.document
                )}
                {purchase.reversed && (
                  <span className="ml-2 align-middle">
                    <Badge tone="danger">{t.reversed}</Badge>
                  </span>
                )}
              </td>
              <td className="text-right font-bold tabular-nums">{fmt.number(purchase.amount)}</td>
              <td className="text-right tabular-nums">{fmt.number(purchase.promoAmount)}</td>
              <td className="text-right tabular-nums">{fmt.signed(purchase.cashback)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </ScrollRegion>
  );
}
