import { LandingPage } from "@/features/landing/landing-page";
import { buildLandingMetadata } from "@/features/landing/metadata";

/** Marketing content must never become request-time rendering. */
export const ensureStatic = "navigation";

export const metadata = buildLandingMetadata("uz");

export default function HomePage() {
  return <LandingPage locale="uz" />;
}
