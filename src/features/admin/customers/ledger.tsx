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

/** Newest first, with the balance after each entry (entries are immutable). */
export function withRunningBalance(entries: ReadonlyArray<LedgerEntry>) {
  let balance = entries.reduce((sum, entry) => sum + entry.amount, 0);
  return entries.map((entry) => {
    const row = { entry, balance };
    balance -= entry.amount;
    return row;
  });
}

export function LedgerTable({ rows }: { rows: ReturnType<typeof withRunningBalance> }) {
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
          {rows.map(({ entry, balance }) => {
            const badge = KIND_BADGE[entry.kind];
            return (
              <tr key={entry.id}>
                <td className="text-ink-muted! tabular-nums">
                  <time dateTime={entry.at}>{formatDateTimeShort(entry.at)}</time>
                </td>
                <td>
                  <Badge tone={badge.tone}>{badge.label}</Badge>
                </td>
                <td>{entry.source}</td>
                <td className="text-ink-muted!">{entry.note}</td>
                <td className="text-right font-bold tabular-nums">{formatSigned(entry.amount)}</td>
                <td className="text-right tabular-nums">{formatNumber(balance)}</td>
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
                {purchase.source === "online" ? (
                  <Link
                    href={`/admin/orders/${purchase.document.replace("№", "")}` as Route}
                    className="text-ink underline decoration-line-strong underline-offset-4 hover:decoration-gold"
                  >
                    {purchase.document}
                  </Link>
                ) : (
                  purchase.document
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
