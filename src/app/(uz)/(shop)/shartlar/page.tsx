import type { Metadata } from "next";

import { LegalPage, legalMetadata } from "@/features/shop/pages/legal";

export function generateMetadata(): Promise<Metadata> {
  return legalMetadata("uz", "terms");
}

export default function Page() {
  return <LegalPage locale="uz" kind="terms" />;
}
