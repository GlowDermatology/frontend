import "server-only";

import { dataSource } from "@/data/source";

/**
 * Whether the live storefront is served (api mode). Mock mode keeps the
 * static marketing landing at `/`, `/ru` and `/en` and answers 404 on the
 * storefront routes: the storefront has no fixtures and needs the customer
 * API. Reads `GLOWDERMA_DATA_SOURCE` after `connection()`, so one build serves
 * both modes; call it inside a Suspense boundary (or a route handler).
 */
export async function storefrontEnabled(): Promise<boolean> {
  return (await dataSource()) === "api";
}
