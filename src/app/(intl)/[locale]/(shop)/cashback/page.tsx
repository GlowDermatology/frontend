import type { Metadata } from "next";

import { CashbackPage, cashbackMetadata } from "@/features/shop/pages/private/loyalty";
import { intlLocaleFrom } from "@/features/shop/routing/intl-locale";

/** Cashback balance, level and history (private). */
export function generateMetadata({ params }: PageProps<"/[locale]/cashback">): Promise<Metadata> {
  return cashbackMetadata(intlLocaleFrom(params));
}

export default function Page({ params, searchParams }: PageProps<"/[locale]/cashback">) {
  return <CashbackPage locale={intlLocaleFrom(params)} searchParams={searchParams} />;
}
