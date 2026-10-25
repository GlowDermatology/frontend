import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { POST } from "@/app/admin/auth/logout/route";

import { cookieNames } from "./cookie-names";
import { mintCsrf } from "./csrf";

/**
 * Route-level regression test for the logout handler's two CSRF defences.
 * Runs in mock mode (no `GLOWDERMA_DATA_SOURCE`), so Django is never called;
 * the branch under test is the request admission before the Django call.
 */

const names = cookieNames(false);
const HOST = "admin.glowderma.uz";

interface RequestOptions {
  headers?: Record<string, string>;
  csrfCookie?: string | null;
  body?: string;
}

function logoutRequest(token: string, options: RequestOptions = {}): NextRequest {
  const headers = new Headers({
    host: HOST,
    "content-type": "application/x-www-form-urlencoded",
    ...options.headers,
  });
  const cookieValue = options.csrfCookie === undefined ? token : options.csrfCookie;
  if (cookieValue !== null) headers.set("cookie", `${names.csrf}=${cookieValue}`);
  return new NextRequest(`https://${HOST}/admin/auth/logout`, {
    method: "POST",
    headers,
    body: options.body ?? `csrf=${encodeURIComponent(token)}&scope=all`,
  });
}

async function expectRejected(response: Response) {
  expect(response.status).toBe(403);
  expect(await response.json()).toMatchObject({ code: "csrf_mismatch" });
  expect(response.headers.get("set-cookie")).toBeNull();
}

describe("POST /admin/auth/logout", () => {
  const savedOrigins = process.env.GLOWDERMA_ALLOWED_ORIGINS;
  const savedSecure = process.env.GLOWDERMA_COOKIE_SECURE;
  const savedSource = process.env.GLOWDERMA_DATA_SOURCE;
  let token: string;

  beforeEach(() => {
    token = mintCsrf();
    process.env.GLOWDERMA_ALLOWED_ORIGINS = "localhost:3000";
    process.env.GLOWDERMA_COOKIE_SECURE = "false";
    delete process.env.GLOWDERMA_DATA_SOURCE;
  });

  afterEach(() => {
    process.env.GLOWDERMA_ALLOWED_ORIGINS = savedOrigins;
    process.env.GLOWDERMA_COOKIE_SECURE = savedSecure;
    if (savedSource === undefined) delete process.env.GLOWDERMA_DATA_SOURCE;
    else process.env.GLOWDERMA_DATA_SOURCE = savedSource;
  });

  it("logs out a same-origin form post with a matching csrf token", async () => {
    const response = await POST(
      logoutRequest(token, {
        headers: { "sec-fetch-site": "same-origin", origin: `https://${HOST}` },
      }),
    );
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("/admin/login");
    const cleared = response.cookies.getAll().map((cookie) => cookie.name);
    expect(cleared).toEqual(
      expect.arrayContaining([names.access, names.refresh, names.csrf, names.refreshBackoff]),
    );
    for (const cookie of response.cookies.getAll()) expect(cookie.maxAge).toBe(0);
  });

  it("rejects a same-site (sibling subdomain) post even when the planted csrf cookie matches", async () => {
    await expectRejected(
      await POST(logoutRequest(token, { headers: { "sec-fetch-site": "same-site" } })),
    );
  });

  it("rejects a cross-site post", async () => {
    await expectRejected(
      await POST(logoutRequest(token, { headers: { "sec-fetch-site": "cross-site" } })),
    );
  });

  it("rejects an Origin or Referer outside the request host and the allowed list", async () => {
    await expectRejected(
      await POST(logoutRequest(token, { headers: { origin: "https://shop.glowderma.uz" } })),
    );
    await expectRejected(
      await POST(
        logoutRequest(token, { headers: { referer: "https://shop.glowderma.uz/admin/x" } }),
      ),
    );
    await expectRejected(await POST(logoutRequest(token, { headers: { origin: "null" } })));
  });

  it("accepts an Origin from GLOWDERMA_ALLOWED_ORIGINS and honours X-Forwarded-Host", async () => {
    const allowed = await POST(
      logoutRequest(token, { headers: { origin: "http://localhost:3000" } }),
    );
    expect(allowed.status).toBe(303);

    const forwarded = await POST(
      logoutRequest(token, {
        headers: {
          host: "next-internal:3000",
          "x-forwarded-host": "panel.glowderma.uz",
          origin: "https://panel.glowderma.uz",
        },
      }),
    );
    expect(forwarded.status).toBe(303);
  });

  it("still requires the double-submit token on a same-origin post", async () => {
    await expectRejected(
      await POST(
        logoutRequest(token, {
          headers: { "sec-fetch-site": "same-origin" },
          body: `csrf=${encodeURIComponent(mintCsrf())}`,
        }),
      ),
    );
    await expectRejected(
      await POST(
        logoutRequest(token, { headers: { "sec-fetch-site": "same-origin" }, csrfCookie: null }),
      ),
    );
  });

  it("accepts the token from the X-CSRF-Token header for JSON clients", async () => {
    const response = await POST(
      logoutRequest(token, {
        headers: {
          "sec-fetch-site": "same-origin",
          "content-type": "application/json",
          "x-csrf-token": token,
        },
        body: JSON.stringify({ scope: "others" }),
      }),
    );
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("/admin/settings");
    expect(response.cookies.getAll()).toHaveLength(0);
  });

  it("treats scope=others without a refresh cookie as an ended session in api mode", async () => {
    process.env.GLOWDERMA_DATA_SOURCE = "api";
    process.env.GLOWDERMA_API_URL = "http://api.test:8000";
    process.env.GLOWDERMA_INTERNAL_SECRET = "s3cret";
    const response = await POST(
      logoutRequest(token, {
        headers: { "sec-fetch-site": "same-origin", origin: `https://${HOST}` },
        body: `csrf=${encodeURIComponent(token)}&scope=others`,
      }),
    );
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("/admin/login");
    const cleared = response.cookies.getAll().map((cookie) => cookie.name);
    expect(cleared).toEqual(expect.arrayContaining([names.access, names.refresh, names.csrf]));
  });

  it("keeps the session on scope=others in mock mode", async () => {
    const response = await POST(
      logoutRequest(token, {
        headers: { "sec-fetch-site": "same-origin", origin: `https://${HOST}` },
        body: `csrf=${encodeURIComponent(token)}&scope=others`,
      }),
    );
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("/admin/settings");
    expect(response.cookies.getAll()).toEqual([]);
  });
});
