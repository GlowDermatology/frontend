import type { Locale } from "@/lib/i18n/locales";

/**
 * Legacy id URLs (`/mahsulotlar/12`, `/ru/specialists/3`) → the slug URL,
 * for the proxy's 301. The proxy cannot use `"use cache"`, so answers are
 * kept in a small in-process map (5 minutes, 500 entries). Free of the
 * `server-only` marker and of `next/headers`, like the rest of the proxy's
 * imports. Any failure (API down, 404, no slug yet) means "no redirect":
 * the page then renders by id or answers its own 404.
 */

const TTL_MS = 5 * 60 * 1000;
const MAX_ENTRIES = 500;
const TIMEOUT_MS = 3_000;
const SLUG = /^(?!\d+$)[a-z0-9]+(?:-[a-z0-9]+)*$/;

const memo = new Map<string, { slug: string | null; at: number }>();

export type LegacyEntity = "product" | "specialist";

function endpoint(entity: LegacyEntity, id: string): string {
  return entity === "product" ? `/api/v1/catalog/products/${id}/` : `/api/v1/specialists/${id}/`;
}

/** Reads `slug` out of an API answer (pure; unit-tested). */
export function slugFromBody(body: unknown): string | null {
  if (typeof body !== "object" || body === null) return null;
  const slug = (body as Record<string, unknown>).slug;
  return typeof slug === "string" && slug.length <= 200 && SLUG.test(slug) ? slug : null;
}

export async function lookupSlug(
  entity: LegacyEntity,
  id: string,
  locale: Locale,
  nowMs: number = Date.now(),
): Promise<string | null> {
  const key = `${entity}:${id}`;
  const cached = memo.get(key);
  if (cached && nowMs - cached.at < TTL_MS) return cached.slug;

  const apiUrl = process.env.GLOWDERMA_API_URL?.replace(/\/+$/, "");
  const secret = process.env.GLOWDERMA_INTERNAL_SECRET;
  if (!apiUrl || !secret) return null;
  let slug: string | null = null;
  try {
    const response = await fetch(`${apiUrl}${endpoint(entity, id)}`, {
      headers: {
        Accept: "application/json",
        "Accept-Language": locale,
        "X-GD-Internal-Secret": secret,
      },
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (response.ok) slug = slugFromBody(await response.json());
    else if (response.status !== 404) return null; // transient: do not remember
  } catch {
    return null;
  }
  memo.delete(key);
  memo.set(key, { slug, at: nowMs });
  while (memo.size > MAX_ENTRIES) {
    const oldest = memo.keys().next().value;
    if (oldest === undefined) break;
    memo.delete(oldest);
  }
  return slug;
}
