import type { Metadata } from "next";

import { HomeSwitch, homeSwitchMetadata } from "@/features/shop/pages/home-switch";

/** `/`: the storefront home in api mode, the static landing in mock mode. */
export function generateMetadata(): Promise<Metadata> {
  return homeSwitchMetadata("uz");
}

export default function HomePage() {
  return <HomeSwitch locale="uz" />;
}
