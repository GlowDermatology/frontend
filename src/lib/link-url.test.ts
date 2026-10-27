import { describe, expect, it } from "vitest";

import {
  contactUrlError,
  INSTAGRAM_URL_MESSAGE,
  isHttpsUrl,
  LINK_URL_MESSAGE,
  TELEGRAM_URL_MESSAGE,
} from "./link-url";

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

  it("refuses IP literals and single-label hosts for the public contact links", () => {
    expect(isHttpsUrl("https://10.0.0.1/", { publicHost: true })).toBe(false);
    expect(isHttpsUrl("https://localhost/", { publicHost: true })).toBe(false);
    expect(isHttpsUrl("https://glowderma.uz", { publicHost: true })).toBe(true);
  });
});

describe("contactUrlError (contract §2.11)", () => {
  it("clears with an empty value and checks https first", () => {
    expect(contactUrlError("", "telegram")).toBeNull();
    expect(contactUrlError("http://t.me/glowderma", "telegram")).toBe(LINK_URL_MESSAGE);
    expect(contactUrlError(`https://x.uz/${"a".repeat(200)}`, "website")).toBe(
      "200 belgidan oshmasin.",
    );
  });

  it("wants one Telegram handle on t.me or telegram.me", () => {
    expect(contactUrlError("https://t.me/glowderma", "telegram")).toBeNull();
    expect(contactUrlError("https://telegram.me/glow_derma/", "telegram")).toBeNull();
    expect(contactUrlError("https://t.me/+AbCdEf", "telegram")).toBeNull();
    expect(contactUrlError("https://t.me/", "telegram")).toBe(TELEGRAM_URL_MESSAGE);
    expect(contactUrlError("https://t.me/a/b", "telegram")).toBe(TELEGRAM_URL_MESSAGE);
    expect(contactUrlError("https://t.me/..", "telegram")).toBe(TELEGRAM_URL_MESSAGE);
    expect(contactUrlError("https://example.uz/glowderma", "telegram")).toBe(TELEGRAM_URL_MESSAGE);
  });

  it("wants one Instagram handle and keeps a query", () => {
    expect(contactUrlError("https://instagram.com/glowderma", "instagram")).toBeNull();
    expect(contactUrlError("https://www.instagram.com/glowderma?igsh=x", "instagram")).toBeNull();
    expect(contactUrlError("https://instagram.com/p/x", "instagram")).toBe(INSTAGRAM_URL_MESSAGE);
  });

  it("takes any public host for the website", () => {
    expect(contactUrlError("https://glowderma.uz", "website")).toBeNull();
    expect(contactUrlError("https://localhost", "website")).toBe(LINK_URL_MESSAGE);
  });
});
