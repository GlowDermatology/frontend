import type { Metadata } from "next";

import { QrPage, qrMetadata } from "@/features/shop/pages/private/loyalty";

/** The in-store QR code, refreshed every 50 s (private). */
export function generateMetadata(): Promise<Metadata> {
  return qrMetadata("uz");
}

export default function Page() {
  return <QrPage locale={"uz"} />;
}
