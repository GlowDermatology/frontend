import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";

import { POST } from "@/app/api/shop/theme/route";

const HOST = "glowderma.uz";

function themeRequest(body: string, headers: Record<string, string> = {}): NextRequest {
  return new NextRequest(`https://${HOST}/api/shop/theme`, {
    method: "POST",
    headers: new Headers({
      host: HOST,
      "content-type": "application/json",
      "sec-fetch-site": "same-origin",
      origin: `https://${HOST}`,
      ...headers,
    }),
    body,
  });
}

describe("POST /api/shop/theme", () => {
  it("re-issues the cookie for a choice", async () => {
    const response = await POST(themeRequest(JSON.stringify({ theme: "dark" })));
    expect(response.status).toBe(204);
    const cookie = response.headers.get("set-cookie") ?? "";
    expect(cookie).toMatch(/^gd_theme=dark;/);
    expect(cookie).toContain("Path=/");
    expect(cookie).toContain("Max-Age=31536000");
    expect(cookie.toLowerCase()).toContain("samesite=lax");
    expect(cookie.toLowerCase()).not.toContain("httponly");
    expect(response.headers.get("cache-control")).toBe("no-store");
  });

  it("system deletes the cookie", async () => {
    const response = await POST(themeRequest(JSON.stringify({ theme: "system" })));
    expect(response.status).toBe(204);
    expect(response.headers.get("set-cookie")).toMatch(/^gd_theme=;.*Max-Age=0/);
  });

  it("refuses a cross-site request and an unknown value", async () => {
    const crossSite = await POST(
      themeRequest(JSON.stringify({ theme: "dark" }), {
        "sec-fetch-site": "cross-site",
        origin: "https://evil.example",
      }),
    );
    expect(crossSite.status).toBe(403);
    expect(crossSite.headers.get("set-cookie")).toBeNull();

    const unknown = await POST(themeRequest(JSON.stringify({ theme: "blue" })));
    expect(unknown.status).toBe(400);
    expect(unknown.headers.get("set-cookie")).toBeNull();

    const malformed = await POST(themeRequest("{"));
    expect(malformed.status).toBe(400);
  });
});
