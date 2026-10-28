/**
 * Whether a product, specialist or category slug exists (the proxy's real
 * 404, U3): the storefront pages stream, so a `notFound()` inside their
 * Suspense boundary can no longer change the status; the proxy asks the API
 * first and rewrites an unknown slug to a page that answers 404. Answers are
 * kept in a small in-process map (5 minutes, 2000 entries); any failure
 * (API down, timeout) is "unknown" and the page renders as before. Free of
 * the `server-only` marker and of `next/headers`, like the proxy's imports.
 */

const TTL_MS = 5 * 60 * 1000;
const MAX_ENTRIES = 2000;
const TIMEOUT_MS = 2_500;

export type SlugEntity = "product" | "specialist" | "category";

const memo = new Map<string, { exists: boolean; at: number }>();
let categories: { slugs: Set<string>; at: number } | null = null;

function remember(key: string, exists: boolean, nowMs: number) {
  memo.delete(key);
  memo.set(key, { exists, at: nowMs });
  while (memo.size > MAX_ENTRIES) {
    const oldest = memo.keys().next().value;
    if (oldest === undefined) break;
    memo.delete(oldest);
  }
}

async function get(path: string): Promise<Response | null> {
  const apiUrl = process.env.GLOWDERMA_API_URL?.replace(/\/+$/, "");
  const secret = process.env.GLOWDERMA_INTERNAL_SECRET;
  if (!apiUrl || !secret) return null;
  try {
    return await fetch(`${apiUrl}${path}`, {
      headers: {
        Accept: "application/json",
        "Accept-Language": "uz",
        "X-GD-Internal-Secret": secret,
      },
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch {
    return null;
  }
}

/** Category slugs out of a `catalog/categories/` answer (pure; unit-tested). */
export function categorySlugs(body: unknown): Set<string> {
  const results = (body as { results?: unknown } | null)?.results;
  const out = new Set<string>();
  if (!Array.isArray(results)) return out;
  for (const item of results) {
    const slug = (item as { slug?: unknown } | null)?.slug;
    if (typeof slug === "string") out.add(slug);
  }
  return out;
}

/** `true` / `false`, or `null` when the API could not tell. */
export async function slugExists(
  entity: SlugEntity,
  slug: string,
  nowMs: number = Date.now(),
): Promise<boolean | null> {
  if (entity === "category") {
    if (!categories || nowMs - categories.at >= TTL_MS) {
      const response = await get("/api/v1/catalog/categories/");
      if (!response?.ok) return null;
      try {
        categories = { slugs: categorySlugs(await response.json()), at: nowMs };
      } catch {
        return null;
      }
    }
    return categories.slugs.has(slug);
  }
  const key = `${entity}:${slug}`;
  const cached = memo.get(key);
  if (cached && nowMs - cached.at < TTL_MS) return cached.exists;
  const path =
    entity === "product"
      ? `/api/v1/catalog/products/${encodeURIComponent(slug)}/`
      : `/api/v1/specialists/${encodeURIComponent(slug)}/`;
  const response = await get(path);
  if (!response) return null;
  if (response.status === 404) {
    remember(key, false, nowMs);
    return false;
  }
  if (!response.ok) return null;
  remember(key, true, nowMs);
  return true;
}
