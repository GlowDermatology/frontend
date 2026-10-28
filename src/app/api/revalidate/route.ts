import { timingSafeEqual } from "node:crypto";

import { revalidateTag } from "next/cache";
import { NextResponse, type NextRequest } from "next/server";

import { parseRevalidationRequest } from "@/data/shop/tags";

/**
 * `POST /api/revalidate` — on-demand revalidation of the storefront caches
 * for the backend or the admin (`Authorization: Bearer
 * <GLOWDERMA_REVALIDATE_SECRET>`). Body: `{"tags": ["shop:product:12"]}`
 * and/or `{"entities": [{"type": "product", "id": 12}]}` (see
 * `src/data/shop/tags.ts`). The tags expire immediately (`expire: 0`): the
 * next visitor of an affected page waits for fresh data instead of seeing
 * the old price once more.
 *
 * Without the secret configured the route answers 404, so an unconfigured
 * deployment exposes nothing. The cache is per Next process: with several
 * instances, call each one (or configure a shared `cacheHandlers` store).
 */

const NO_STORE = { "Cache-Control": "no-store" } as const;
const MAX_BODY_BYTES = 16 * 1024;

function bearer(request: NextRequest): string | null {
  const header = request.headers.get("authorization") ?? "";
  const match = /^Bearer ([\x21-\x7e]{1,512})$/.exec(header);
  return match ? match[1]! : null;
}

function secretMatches(expected: string, presented: string | null): boolean {
  if (!presented) return false;
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(presented, "utf8");
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(request: NextRequest) {
  const secret = process.env.GLOWDERMA_REVALIDATE_SECRET;
  if (!secret || secret.length < 32) {
    return NextResponse.json({ code: "not_found" }, { status: 404, headers: NO_STORE });
  }
  if (!secretMatches(secret, bearer(request))) {
    return NextResponse.json({ code: "not_authenticated" }, { status: 401, headers: NO_STORE });
  }
  const raw = await request.text();
  if (raw.length > MAX_BODY_BYTES) {
    return NextResponse.json({ code: "too_large" }, { status: 413, headers: NO_STORE });
  }
  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json(
      { code: "invalid_json", message: "body must be JSON" },
      { status: 400, headers: NO_STORE },
    );
  }
  const parsed = parseRevalidationRequest(body);
  if (!parsed.ok) {
    return NextResponse.json(
      { code: "validation_error", message: parsed.error },
      { status: 400, headers: NO_STORE },
    );
  }
  for (const tag of parsed.tags) revalidateTag(tag, { expire: 0 });
  return NextResponse.json({ revalidated: parsed.tags }, { headers: NO_STORE });
}
