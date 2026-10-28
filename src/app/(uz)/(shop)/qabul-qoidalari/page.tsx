import type { Metadata } from "next";

import { LegalPage, legalMetadata } from "@/features/shop/pages/legal";

export function generateMetadata(): Promise<Metadata> {
  return legalMetadata("uz", "bookingPolicy");
}

export default function Page() {
  return <LegalPage locale="uz" kind="bookingPolicy" />;
}
