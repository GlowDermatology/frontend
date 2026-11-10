import { connection } from "next/server";

import {
  androidFingerprints,
  androidPackage,
  assetLinks,
  wellKnownResponse,
} from "@/lib/app-links";

/**
 * Android App Links of the Glow Derma app (`/pay/return`); 404 until
 * `GLOWDERMA_APP_LINKS_ANDROID_SHA256` is set (read per request).
 */
export async function GET() {
  await connection();
  return wellKnownResponse(
    assetLinks(
      androidPackage(process.env.GLOWDERMA_APP_LINKS_ANDROID_PACKAGE),
      androidFingerprints(process.env.GLOWDERMA_APP_LINKS_ANDROID_SHA256),
    ),
  );
}
