import { describe, expect, it } from "vitest";

import { csrfMatches, mintCsrf } from "./csrf";

describe("csrf", () => {
  it("mints 32 random bytes as base64url", () => {
    const token = mintCsrf();
    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(Buffer.from(token, "base64url")).toHaveLength(32);
    expect(mintCsrf()).not.toBe(token);
  });

  it("matches only the identical non-empty value", () => {
    const token = mintCsrf();
    expect(csrfMatches(token, token)).toBe(true);
    expect(csrfMatches(token, mintCsrf())).toBe(false);
    expect(csrfMatches(token, token.slice(0, -1))).toBe(false);
    expect(csrfMatches(token, token + "a")).toBe(false);
    expect(csrfMatches("", "")).toBe(false);
    expect(csrfMatches(token, "")).toBe(false);
    expect(csrfMatches(undefined, token)).toBe(false);
    expect(csrfMatches(token, undefined)).toBe(false);
    expect(csrfMatches(token, null)).toBe(false);
    expect(csrfMatches(null, null)).toBe(false);
  });
});
