import type { Metadata } from "next";

import { ServicesPage, servicesMetadata } from "@/features/shop/pages/services";

export function generateMetadata(): Promise<Metadata> {
  return servicesMetadata("uz");
}

export default function Page() {
  return <ServicesPage locale="uz" />;
}
