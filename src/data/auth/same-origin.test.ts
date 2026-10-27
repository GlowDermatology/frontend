import { describe, expect, it } from "vitest";

import { isSameOriginRequest } from "./same-origin";

const base = {
  secFetchSite: null,
  origin: null,
  referer: null,
  requestHost: "admin.glowderma.uz",
  allowedOrigins: ["localhost:3000"],
};

describe("isSameOriginRequest", () => {
  it("accepts same-origin and user-initiated navigations", () => {
    expect(isSameOriginRequest({ ...base, secFetchSite: "same-origin" })).toBe(true);
    expect(isSameOriginRequest({ ...base, secFetchSite: "none" })).toBe(true);
    expect(isSameOriginRequest(base)).toBe(true);
  });

  it("rejects cross-site and same-site (sibling subdomain) fetch metadata", () => {
    expect(isSameOriginRequest({ ...base, secFetchSite: "cross-site" })).toBe(false);
    expect(isSameOriginRequest({ ...base, secFetchSite: "same-site" })).toBe(false);
  });

  it("checks Origin and Referer hosts against the request host and the allowed list", () => {
    expect(isSameOriginRequest({ ...base, origin: "https://admin.glowderma.uz" })).toBe(true);
    expect(
      isSameOriginRequest({ ...base, referer: "https://admin.glowderma.uz/admin/orders" }),
    ).toBe(true);
    expect(isSameOriginRequest({ ...base, origin: "http://localhost:3000" })).toBe(true);
    expect(isSameOriginRequest({ ...base, origin: "https://evil.example" })).toBe(false);
    expect(isSameOriginRequest({ ...base, referer: "https://evil.example/admin" })).toBe(false);
    expect(isSameOriginRequest({ ...base, origin: "http://localhost:3001" })).toBe(false);
    expect(isSameOriginRequest({ ...base, origin: "https://glowderma.uz" })).toBe(false);
    expect(isSameOriginRequest({ ...base, origin: "null" })).toBe(false);
    expect(isSameOriginRequest({ ...base, origin: "not a url" })).toBe(false);
    expect(
      isSameOriginRequest({
        ...base,
        origin: "https://admin.glowderma.uz",
        referer: "https://evil.example/",
      }),
    ).toBe(false);
  });

  it("is case-insensitive on hosts", () => {
    expect(isSameOriginRequest({ ...base, origin: "https://Admin.GlowDerma.uz" })).toBe(true);
  });
});
