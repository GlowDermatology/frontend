import type { Metadata } from "next";

import { LegalPage, legalMetadata } from "@/features/shop/pages/legal";

export function generateMetadata(): Promise<Metadata> {
  return legalMetadata("uz", "privacy");
}

export default function Page() {
  return <LegalPage locale="uz" kind="privacy" />;
}
