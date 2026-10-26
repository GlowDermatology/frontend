import Link from "next/link";
import type { Route } from "next";

import { Badge, type Tone } from "@/components/ui/badge";
import { ScrollRegion } from "@/components/ui/scroll-region";
import type { LedgerEntry, LedgerEntryKind } from "@/domain/cashback";
import type { CustomerPurchase } from "@/domain/customer";
import { formatDateTimeShort, formatNumber, formatSigned } from "@/lib/format";

const KIND_BADGE: Record<LedgerEntryKind, { label: string; tone: Tone }> = {
  credit: { label: "Hisoblandi", tone: "success" },
  debit: { label: "Ishlatildi", tone: "gold" },
  adjustment: { label: "Tuzatish", tone: "neutral" },
  reversal: { label: "Qaytarildi", tone: "danger" },
};

/** Order link of a ledger or purchase row. */
const orderLinkClass =
  "whitespace-nowrap text-ink underline decoration-line-strong underline-offset-4 hover:decoration-gold";

/**
 * The cashback ledger, newest first. BALANS is each entry's `balanceAfter`
 * (the server's own running total, contract §5.3); order entries link to the
 * order, and a credit names the policy version it was computed with.
 */
export function LedgerTable({ rows }: { rows: ReadonlyArray<LedgerEntry> }) {
  return (
    <ScrollRegion label="Cashback yozuvlari">
      <table className="data-table min-w-[760px]">
        <caption className="sr-only">Cashback yozuvlari, eng yangisi birinchi</caption>
        <thead>
          <tr>
            <th scope="col">SANA</th>
            <th scope="col">TURI</th>
            <th scope="col">MANBA</th>
            <th scope="col">IZOH</th>
            <th scope="col" className="text-right!">
              SUMMA
            </th>
            <th scope="col" className="text-right!">
              BALANS
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((entry) => {
            const badge = KIND_BADGE[entry.kind];
            return (
              <tr key={entry.id}>
                <td className="text-ink-muted! tabular-nums">
                  <time dateTime={entry.at}>{formatDateTimeShort(entry.at)}</time>
                </td>
                <td>
                  <Badge tone={badge.tone}>{badge.label}</Badge>
                </td>
                <td>
                  {entry.orderId !== undefined ? (
                    <Link
                      href={`/admin/orders/${entry.orderId}` as Route}
                      className={orderLinkClass}
                    >
                      {entry.source}
                    </Link>
                  ) : (
                    entry.source
                  )}
                </td>
                <td className="text-ink-muted!">
                  {entry.note}
                  {entry.kind === "credit" && entry.policyVersion !== undefined && (
                    <span
                      className="text-[12px] whitespace-nowrap"
                      title={`Cashback siyosati v${entry.policyVersion} bo‘yicha hisoblangan`}
                    >
                      {" "}
                      · v{entry.policyVersion}
                    </span>
                  )}
                </td>
                <td className="text-right font-bold tabular-nums">{formatSigned(entry.amount)}</td>
                <td className="text-right tabular-nums">
                  {entry.balanceAfter === undefined ? "—" : formatNumber(entry.balanceAfter)}
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
  return (
    <ScrollRegion label="Xaridlar">
      <table className="data-table min-w-[760px]">
        <thead>
          <tr>
            <th scope="col">SANA</th>
            <th scope="col">MANBA</th>
            <th scope="col">HUJJAT</th>
            <th scope="col" className="text-right!">
              SUMMA
            </th>
            <th scope="col" className="text-right!">
              AKSIYADAGI QISM
            </th>
            <th scope="col" className="text-right!">
              CASHBACK
            </th>
          </tr>
        </thead>
        <tbody>
          {purchases.map((purchase) => (
            <tr key={purchase.id}>
              <td className="text-ink-muted! tabular-nums">
                <time dateTime={purchase.at}>{formatDateTimeShort(purchase.at)}</time>
              </td>
              <td>{purchase.source === "online" ? "Onlayn" : "Do‘kon · QR"}</td>
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
                    <Badge tone="danger">Qaytarilgan</Badge>
                  </span>
                )}
              </td>
              <td className="text-right font-bold tabular-nums">{formatNumber(purchase.amount)}</td>
              <td className="text-right tabular-nums">{formatNumber(purchase.promoAmount)}</td>
              <td className="text-right tabular-nums">{formatSigned(purchase.cashback)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </ScrollRegion>
  );
}
