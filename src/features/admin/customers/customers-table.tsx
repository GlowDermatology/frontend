import Link from "next/link";
import type { Route } from "next";

import { Badge } from "@/components/ui/badge";
import { ScrollRegion } from "@/components/ui/scroll-region";
import type { CustomerListItem } from "@/domain/customer";
import { formatNumber, formatPhone, formatSom } from "@/lib/format";

import { percentLabel, registeredLabel } from "./labels";

/** Rows of the customers list (contract §2.6 `CustomerListItem`). */
export function CustomersTable({ customers }: { customers: ReadonlyArray<CustomerListItem> }) {
  return (
    <ScrollRegion label="Mijozlar jadvali">
      <table className="data-table min-w-[960px] transition-opacity duration-150 group-data-[pending]:opacity-60">
        <caption className="sr-only">Mijozlar</caption>
        <thead>
          <tr>
            <th scope="col">MIJOZ</th>
            <th scope="col">TELEFON</th>
            <th scope="col">RO‘YXATDAN O‘TGAN</th>
            <th scope="col" className="text-right!">
              JAMI XARIDLAR
            </th>
            <th scope="col" className="text-right!">
              ONLAYN BUYURTMALAR
            </th>
            <th scope="col" className="text-right!">
              CASHBACK
            </th>
            <th scope="col" className="text-right!">
              BALANS
            </th>
            <th scope="col">HOLAT</th>
          </tr>
        </thead>
        <tbody>
          {customers.map((customer) => (
            <tr key={customer.id}>
              <td>
                <Link
                  href={`/admin/customers/${customer.id}` as Route}
                  className="font-bold text-ink no-underline hover:underline hover:decoration-gold hover:underline-offset-4"
                >
                  {customer.name}
                </Link>
              </td>
              <td className="tabular-nums">{formatPhone(customer.phone)}</td>
              <td className="text-ink-muted tabular-nums">
                <time dateTime={customer.registeredAt}>
                  {registeredLabel(customer.registeredAt)}
                </time>
              </td>
              <td className="text-right tabular-nums">{formatSom(customer.lifetimeTotal)}</td>
              <td className="text-right tabular-nums">
                {formatNumber(customer.onlineOrdersCount)}
              </td>
              <td className="text-right tabular-nums">{percentLabel(customer.percent)}</td>
              <td className="text-right tabular-nums">{formatSom(customer.balance)}</td>
              <td>
                {customer.status === "active" ? (
                  <Badge tone="success">Faol</Badge>
                ) : (
                  <Badge tone="muted">O‘chirilgan</Badge>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </ScrollRegion>
  );
}
