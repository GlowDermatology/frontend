import { describe, expect, it } from "vitest";

import {
  mediaRemotePatterns,
  mediaUrlMatches,
  parseMediaHost,
  parseMediaHosts,
} from "./media-hosts";

describe("parseMediaHost", () => {
  it("reads host, port and path prefix", () => {
    expect(parseMediaHost("Example.UZ")).toEqual({ hostname: "example.uz" });
    expect(parseMediaHost("localhost:8001")).toEqual({ hostname: "localhost", port: "8001" });
    expect(parseMediaHost("example.uz/media/")).toEqual({
      hostname: "example.uz",
      pathPrefix: "/media",
    });
    expect(parseMediaHost("example.uz:443/a/b")).toEqual({
      hostname: "example.uz",
      port: "443",
      pathPrefix: "/a/b",
    });
  });

  it.each([
    "",
    "https://example.uz",
    "*.example.uz",
    "example.uz:x",
    "a:1:2",
    "example.uz/../x",
    "exa mple.uz",
  ])("refuses %j", (entry) => {
    expect(() => parseMediaHost(entry)).toThrow(/GLOWDERMA_MEDIA_HOSTS/);
  });
});

describe("mediaUrlMatches", () => {
  const site = parseMediaHost("example.uz/media");

  it("accepts only the media prefix on a shared origin", () => {
    expect(mediaUrlMatches(new URL("https://example.uz/media/catalog/a.webp"), site)).toBe(true);
    expect(mediaUrlMatches(new URL("https://example.uz/mediax/a.webp"), site)).toBe(false);
    expect(mediaUrlMatches(new URL("https://example.uz/admin/orders"), site)).toBe(false);
    expect(mediaUrlMatches(new URL("https://example.uz/media"), site)).toBe(false);
    expect(mediaUrlMatches(new URL("https://other.uz/media/a.webp"), site)).toBe(false);
  });

  it("matches any port and path when the entry names neither", () => {
    const host = parseMediaHost("media.example.uz");
    expect(mediaUrlMatches(new URL("https://media.example.uz:8443/x/y.png"), host)).toBe(true);
    expect(
      mediaUrlMatches(new URL("http://localhost:8001/x"), parseMediaHost("localhost:8000")),
    ).toBe(false);
  });
});

describe("mediaRemotePatterns", () => {
  it("builds next/image remote patterns", () => {
    expect(mediaRemotePatterns("example.uz/media, localhost:8001")).toEqual([
      { hostname: "example.uz", pathname: "/media/**" },
      { hostname: "localhost", port: "8001" },
    ]);
    expect(mediaRemotePatterns(undefined)).toEqual([]);
    expect(parseMediaHosts(" , ")).toEqual([]);
  });
});
