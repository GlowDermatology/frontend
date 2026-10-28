import type { Metadata } from "next";

import { CashbackPage, cashbackMetadata } from "@/features/shop/pages/private/loyalty";

/** Cashback balance, level and history (private). */
export function generateMetadata(): Promise<Metadata> {
  return cashbackMetadata("uz");
}

export default function Page({ searchParams }: PageProps<"/cashback">) {
  return <CashbackPage locale={"uz"} searchParams={searchParams} />;
}
