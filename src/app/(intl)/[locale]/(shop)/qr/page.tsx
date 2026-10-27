import type { Metadata } from "next";

import { QrPage, qrMetadata } from "@/features/shop/pages/private/loyalty";
import { intlLocaleFrom } from "@/features/shop/routing/intl-locale";

/** The in-store QR code, refreshed every 50 s (private). */
export function generateMetadata({ params }: PageProps<"/[locale]/qr">): Promise<Metadata> {
  return qrMetadata(intlLocaleFrom(params));
}

export default function Page({ params }: PageProps<"/[locale]/qr">) {
  return <QrPage locale={intlLocaleFrom(params)} />;
}
