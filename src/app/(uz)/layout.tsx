import "../globals.css";

import { landingViewport } from "@/features/landing/metadata";
import { SiteDocument } from "@/features/landing/site-document";

export const viewport = landingViewport;

/** Root layout for the Uzbek landing page, served at `/`. */
export default function UzRootLayout({ children }: LayoutProps<"/">) {
  return <SiteDocument locale="uz">{children}</SiteDocument>;
}
