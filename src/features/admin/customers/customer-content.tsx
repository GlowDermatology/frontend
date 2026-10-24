import { notFound } from "next/navigation";

import { getCashbackSettings } from "@/data/cashback";
import { referenceNow } from "@/data/config";
import { getCustomer } from "@/data/customers";
import { nextTier, rateFor } from "@/domain/cashback";
import { lifetimeTotal } from "@/domain/customer";

import { CustomerView, type TierInfo } from "./customer-view";

export async function CustomerContent({ params }: { params: Promise<{ customerId: string }> }) {
  const { customerId } = await params;
  const [customer, settings] = await Promise.all([getCustomer(customerId), getCashbackSettings()]);
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

  return <CustomerView customer={customer} tier={tier} now={referenceNow().toISOString()} />;
}
