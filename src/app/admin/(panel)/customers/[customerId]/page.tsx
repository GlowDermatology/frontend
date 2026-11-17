import type { Metadata } from "next";
import { Suspense } from "react";

import { getCustomer } from "@/data/customers";
import { CustomerContent } from "@/features/admin/customers/customer-content";
import { customerDisplayName } from "@/features/admin/customers/labels";
import { PageSkeleton } from "@/features/admin/shared/skeleton";
import { pageTitles } from "@/features/admin/shell/page-metadata";
import { getAdminLocale } from "@/lib/i18n/admin-locale";

export async function generateMetadata({
  params,
}: PageProps<"/admin/customers/[customerId]">): Promise<Metadata> {
  const [customer, titles, locale] = await Promise.all([
    params.then(({ customerId }) => getCustomer(customerId)),
    pageTitles(),
    getAdminLocale(),
  ]);
  return { title: customer ? customerDisplayName(customer.name, locale) : titles.customer };
}

export default function CustomerPage({ params }: PageProps<"/admin/customers/[customerId]">) {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <CustomerContent params={params} />
    </Suspense>
  );
}
