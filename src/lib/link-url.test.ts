import { describe, expect, it } from "vitest";

import { isHttpsUrl } from "./link-url";

describe("isHttpsUrl (contract §1.4 link URLs)", () => {
  it("accepts absolute https URLs, the scheme in any case, port 443", () => {
    expect(isHttpsUrl("https://glowderma.uz/aksiya")).toBe(true);
    expect(isHttpsUrl("HTTPS://x.uz/A")).toBe(true);
    expect(isHttpsUrl("https://x.uz:443/a?b=1#c")).toBe(true);
  });

  it("refuses other schemes, credentials, other ports and unsafe characters", () => {
    for (const value of [
      "http://glowderma.uz",
      "glowderma.uz",
      "https://",
      "https://user:pw@x.uz",
      "https://x.uz:8443/",
      "https://x.uz/a b",
      'https://x.uz/"a',
      "https://x.uz/‮",
      "javascript:alert(1)",
    ]) {
      expect(isHttpsUrl(value), value).toBe(false);
    }
  });

  it("refuses IP literals and single-label hosts with publicHost", () => {
    expect(isHttpsUrl("https://10.0.0.1/", { publicHost: true })).toBe(false);
    expect(isHttpsUrl("https://localhost/", { publicHost: true })).toBe(false);
    expect(isHttpsUrl("https://glowderma.uz", { publicHost: true })).toBe(true);
  });
});
