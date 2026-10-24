/**
 * Data source switch. Everything under `src/data` is the seam between the UI
 * and the Django REST API: today the functions read in-memory fixtures; when
 * the API is ready each function's body becomes a `fetch` to `/api/v1/...`
 * and the presentation layer stays unchanged.
 */
export const DATA_SOURCE: "mock" | "api" = "mock";

export const IS_DEMO = DATA_SOURCE === "mock";

/**
 * The moment the demo dataset is anchored to: Saturday, 24 October 2026,
 * 12:00 in Tashkent (the date shown on the dashboard design). Using a fixed
 * instant keeps prerendering deterministic; with the API this becomes the
 * request time.
 */
export const DEMO_NOW = "2026-10-24T12:00:00+05:00";

export function referenceNow(): Date {
  return new Date(DEMO_NOW);
}
