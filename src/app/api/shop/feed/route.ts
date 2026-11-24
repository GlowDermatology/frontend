import { NextResponse, type NextRequest } from "next/server";

import { feedCursorOf } from "@/data/api/customer/live-mappers";
import { feedCategoryOf, getFeedPage } from "@/data/shop/live";
import { storefrontEnabled } from "@/data/shop/mode";
import { isLocale } from "@/lib/i18n/locales";

/**
 * `GET /api/shop/feed?locale=uz&cursor=…&category=…` — the next page of the
 * home's «Kashf eting» feed for the browser. It answers from the same
 * anonymous `"use cache"` read the server-rendered first page uses
 * (`getFeedPage`, 30 s), through this server's API client: the browser
 * never calls Django. Nothing personal is read or sent, so the answer may
 * be cached by shared caches for as long as the read itself.
 *
 * 404 in mock mode (no storefront) and when the backend has no feed yet;
 * 400 for a malformed parameter (a cursor the API did not issue, an unknown
 * locale); 503 when the API fails.
 */

const NO_STORE = { "Cache-Control": "no-store" } as const;
const CACHEABLE = { "Cache-Control": "public, max-age=0, s-maxage=30, stale-while-revalidate=30" };

function refuse(status: number, code: string) {
  return NextResponse.json({ code }, { status, headers: NO_STORE });
}

export async function GET(request: NextRequest) {
  if (!(await storefrontEnabled())) return refuse(404, "not_found");
  const params = request.nextUrl.searchParams;
  const locale = params.get("locale") ?? "uz";
  if (!isLocale(locale)) return refuse(400, "invalid_locale");
  const rawCursor = params.get("cursor");
  const cursor = rawCursor ? feedCursorOf(rawCursor) : null;
  if (rawCursor && !cursor) return refuse(400, "invalid_cursor");
  const rawCategory = params.get("category");
  const category = rawCategory ? feedCategoryOf(rawCategory) : null;
  if (rawCategory && !category) return refuse(400, "invalid_category");

  let page;
  try {
    page = await getFeedPage(locale, cursor, category);
  } catch (error) {
    console.error("[shop] feed page unavailable", error);
    return refuse(503, "unavailable");
  }
  if (!page) return refuse(404, "not_found");
  return NextResponse.json(
    { items: page.items, nextCursor: page.nextCursor },
    { headers: CACHEABLE },
  );
}
