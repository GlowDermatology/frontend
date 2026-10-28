import type { Metadata } from "next";

import { SpecialistsPage, specialistsMetadata } from "@/features/shop/pages/specialists";

export function generateMetadata(): Promise<Metadata> {
  return specialistsMetadata("uz");
}

export default function Page() {
  return <SpecialistsPage locale="uz" />;
}
