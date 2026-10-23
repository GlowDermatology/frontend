import { SECTION_IDS } from "@/config/site";

import { CashbackSection } from "./components/cashback-section";
import { CatalogSection } from "./components/catalog-section";
import { DeliverySection } from "./components/delivery-section";
import { DownloadCta } from "./components/download-cta";
import { Hero } from "./components/hero";
import { Pillars } from "./components/pillars";
import { QrSection } from "./components/qr-section";
import { SiteFooter } from "./components/site-footer";
import { SiteHeader } from "./components/site-header";
import { SpecialistsSection } from "./components/specialists-section";
import { getDictionary, type Locale } from "./i18n";

/** The public landing page. Server-rendered and fully static per locale. */
export function LandingPage({ locale }: { locale: Locale }) {
  const dict = getDictionary(locale);
  return (
    <div id={SECTION_IDS.top} className="flex min-h-dvh flex-col bg-surface text-ink">
      <a
        href={`#${SECTION_IDS.main}`}
        className="sr-only z-50 rounded-md bg-ink px-4 py-3 text-label text-surface focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        {dict.skipLink}
      </a>
      <SiteHeader dict={dict} locale={locale} />
      <main id={SECTION_IDS.main} tabIndex={-1} className="focus:outline-none">
        <Hero dict={dict} />
        <Pillars dict={dict.pillars} />
        <CatalogSection dict={dict.catalog} />
        <CashbackSection dict={dict.cashback} />
        <QrSection dict={dict.qr} />
        <SpecialistsSection dict={dict.specialists} />
        <DeliverySection dict={dict.delivery} />
        <DownloadCta dict={dict.download} />
      </main>
      <SiteFooter dict={dict} />
    </div>
  );
}
