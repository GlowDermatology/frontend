import { notFound } from "next/navigation";

import { requireStaff } from "@/data/auth";
import { getCashbackSettings } from "@/data/cashback";
import { getCustomer } from "@/data/customers";
import { requestNow } from "@/data/now";
import { nextTier, rateFor } from "@/domain/cashback";
import { lifetimeTotal } from "@/domain/customer";

import { CustomerView, type TierInfo } from "./customer-view";

export async function CustomerContent({ params }: { params: Promise<{ customerId: string }> }) {
  await requireStaff();
  const { customerId } = await params;
  const [customer, settings, now] = await Promise.all([
    getCustomer(customerId),
    getCashbackSettings(),
    requestNow(),
  ]);
  if (!customer) notFound();

  const lifetime = lifetimeTotal(customer);
  const { tiers } = settings.policy;
  const next = nextTier(tiers, lifetime);
  const tier: TierInfo = {
    percent: rateFor(tiers, lifetime),
    next: next && {
      percent: next.tier.percent,
      remaining: next.remaining,
      progress: next.progress,
    },
  };

  return <CustomerView customer={customer} tier={tier} now={now.toISOString()} />;
}
