import Link from "next/link";
import type { Route } from "next";

import { Badge } from "@/components/ui/badge";
import { ScrollRegion } from "@/components/ui/scroll-region";
import { customerDataCopy } from "@/domain/copy/customers";
import type { CustomerListItem } from "@/domain/customer";
import type { AdminFormatter } from "@/lib/format";
import type { Locale } from "@/lib/i18n/locales";

import type { CustomersCopy } from "./copy";
import { customerDisplayName, percentLabel, registeredLabel } from "./labels";

interface CustomersTableProps {
  customers: ReadonlyArray<CustomerListItem>;
  t: CustomersCopy;
  fmt: AdminFormatter;
  locale: Locale;
}

/** Rows of the customers list (contract §2.6 `CustomerListItem`), in the admin language. */
export function CustomersTable({ customers, t, fmt, locale }: CustomersTableProps) {
  const c = t.table;
  const status = customerDataCopy[locale].status;
  return (
    <ScrollRegion label={c.label}>
      <table className="data-table min-w-[960px] transition-opacity duration-150 group-data-[pending]:opacity-60">
        <caption className="sr-only">{c.caption}</caption>
        <thead className="uppercase">
          <tr>
            <th scope="col">{c.customer}</th>
            <th scope="col">{c.phone}</th>
            <th scope="col">{c.registered}</th>
            <th scope="col" className="text-right!">
              {c.total}
            </th>
            <th scope="col" className="text-right!">
              {c.online}
            </th>
            <th scope="col" className="text-right!">
              {c.cashback}
            </th>
            <th scope="col" className="text-right!">
              {c.balance}
            </th>
            <th scope="col">{c.status}</th>
          </tr>
        </thead>
        <tbody>
          {customers.map((customer) => {
            const name = customerDisplayName(customer.name, locale);
            return (
              <tr key={customer.id}>
                <td>
                  <Link
                    href={`/admin/customers/${customer.id}` as Route}
                    title={name}
                    className="line-clamp-2 max-w-[260px] font-bold break-words text-ink no-underline hover:underline hover:decoration-gold hover:underline-offset-4"
                  >
                    {name}
                  </Link>
                </td>
                <td className="whitespace-nowrap tabular-nums">{fmt.phone(customer.phone)}</td>
                <td className="text-ink-muted tabular-nums">
                  <time dateTime={customer.registeredAt}>
                    {registeredLabel(customer.registeredAt, fmt)}
                  </time>
                </td>
                <td className="text-right whitespace-nowrap tabular-nums">
                  {fmt.som(customer.lifetimeTotal)}
                </td>
                <td className="text-right tabular-nums">
                  {fmt.number(customer.onlineOrdersCount)}
                </td>
                <td className="text-right tabular-nums">
                  {percentLabel(customer.percent, locale)}
                </td>
                <td className="text-right whitespace-nowrap tabular-nums">
                  {fmt.som(customer.balance)}
                </td>
                <td>
                  {customer.status === "active" ? (
                    <Badge tone="success">{status.active}</Badge>
                  ) : (
                    <Badge tone="muted">{status.deleted}</Badge>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </ScrollRegion>
  );
}
