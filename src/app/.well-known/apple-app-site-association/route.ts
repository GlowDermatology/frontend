import { connection } from "next/server";

import { appleAppIds, appleAppSiteAssociation, wellKnownResponse } from "@/lib/app-links";

/**
 * iOS universal links of the Glow Derma app (`/pay/return`). Served as
 * `application/json` without an extension, as Apple requires; 404 until
 * `GLOWDERMA_APP_LINKS_APPLE_APP_IDS` is set (read per request).
 */
export async function GET() {
  await connection();
  return wellKnownResponse(
    appleAppSiteAssociation(appleAppIds(process.env.GLOWDERMA_APP_LINKS_APPLE_APP_IDS)),
  );
}
