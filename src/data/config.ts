/**
 * Client-safe constants of the data layer. The data source switch itself
 * (`mock` fixtures or the Django API) is server-only: see `./source.ts`,
 * which reads `GLOWDERMA_DATA_SOURCE` at request time.
 */

/**
 * The moment the demo dataset is anchored to: Saturday, 24 October 2026,
 * 12:00 in Tashkent (the date shown on the dashboard design). Using a fixed
 * instant keeps the fixtures deterministic; server code that must follow the
 * data source uses `requestNow()` from `./now.ts` instead.
 */
export const DEMO_NOW = "2026-10-24T12:00:00+05:00";

/** The demo instant as a `Date`; for mock internals and client components. */
export function referenceNow(): Date {
  return new Date(DEMO_NOW);
}
