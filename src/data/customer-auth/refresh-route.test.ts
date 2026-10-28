import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/headers", () => ({ headers: async () => new Headers() }));

const refreshCustomerSession = vi.fn();
vi.mock("@/data/customer-auth/refresh-service", () => ({
  refreshCustomerSession: (...args: unknown[]) => refreshCustomerSession(...args),
}));

import { GET, POST } from "@/app/api/shop/auth/refresh/route";

/**
 * The storefront refresh route (S1): a cross-site arrival — the return from
 * Click/Payme with a lapsed access cookie — must not 303 straight back to
 * `next` (the proxy bounces that page here again: a redirect loop). It gets
 * a same-origin reload page instead and never touches the session.
 */

const HOST = "www.glowderma.uz";
const NEXT = "/buyurtmalar/10248?paid=1";

function request(method: "GET" | "POST", headers: Record<string, string>) {
  return new NextRequest(`https://${HOST}/api/shop/auth/refresh?next=${encodeURIComponent(NEXT)}`, {
    method,
    headers: new Headers({ host: HOST, cookie: "gd_cust_refresh=r", ...headers }),
  });
}

describe("GET /api/shop/auth/refresh", () => {
  const saved = { ...process.env };
  beforeEach(() => {
    process.env.GLOWDERMA_DATA_SOURCE = "api";
    process.env.GLOWDERMA_ALLOWED_ORIGINS = HOST;
    process.env.GLOWDERMA_COOKIE_SECURE = "false";
    refreshCustomerSession.mockReset();
  });
  afterEach(() => {
    process.env = { ...saved };
  });

  it("answers a cross-site arrival with a same-origin reload, not a 303 loop", async () => {
    const response = await GET(request("GET", { "sec-fetch-site": "cross-site" }));
    expect(response.status).toBe(200);
    expect(response.headers.get("location")).toBeNull();
    const html = await response.text();
    expect(html).toContain('http-equiv="refresh"');
    expect(html).toContain("/api/shop/auth/refresh?next=");
    expect(refreshCustomerSession).not.toHaveBeenCalled();
  });

  it("rotates a same-origin request and returns to next", async () => {
    refreshCustomerSession.mockResolvedValue({ kind: "ended", code: "SESSION_EXPIRED" });
    const response = await GET(request("GET", { "sec-fetch-site": "same-origin" }));
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toContain("/kirish?next=");
    expect(refreshCustomerSession).toHaveBeenCalledTimes(1);
  });

  it("accepts POST (a Server Action render redirected here) with the same rules", async () => {
    const response = await POST(request("POST", { "sec-fetch-site": "cross-site" }));
    expect(response.status).toBe(200);
    expect(refreshCustomerSession).not.toHaveBeenCalled();
  });
});
