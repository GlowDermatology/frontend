import { notFound } from "next/navigation";

import { requireStaff } from "@/data/auth";
import { getCustomer } from "@/data/customers";
import { requestNow } from "@/data/now";

import { CustomerView } from "./customer-view";

/**
 * Data boundary of `/admin/customers/[customerId]` (contract §2.6
 * `GET customers/{id}/`). `getCustomer` is `cache()`d, so this read and the
 * page's `generateMetadata` share one request; an unknown id renders the
 * route's not-found state. The tier, balances and `balance_after` come from
 * the server (mock mode derives them from the fixtures the same way).
 */
export async function CustomerContent({ params }: { params: Promise<{ customerId: string }> }) {
  await requireStaff();
  const { customerId } = await params;
  const [customer, now] = await Promise.all([getCustomer(customerId), requestNow()]);
  if (!customer) notFound();
  return <CustomerView customer={customer} now={now.toISOString()} />;
}
