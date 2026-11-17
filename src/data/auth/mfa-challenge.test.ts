import { describe, expect, it } from "vitest";

import {
  backToSignIn,
  clearMfaChallengeCookie,
  isMfaChallenge,
  isMfaChallengeAnswer,
  mfaChallengeCookie,
  openPendingMfa,
} from "./mfa-challenge";
import { decideProxy } from "./proxy-decision";
import { safeNext } from "./next-param";

const CHALLENGE = "a".repeat(43);
const NOW = Date.parse("2026-11-17T10:00:00Z");

const cookieFor = (expiresAt: string, next: unknown = "/admin/orders") =>
  mfaChallengeCookie({
    secure: false,
    answer: { challenge: CHALLENGE, challenge_expires_at: expiresAt },
    next,
    nowMs: NOW,
  });

describe("the MFA challenge answer", () => {
  it("is told apart from a session by mfa_required", () => {
    expect(
      isMfaChallengeAnswer({
        mfa_required: true,
        challenge: CHALLENGE,
        challenge_expires_at: "2026-11-17T10:05:00Z",
      }),
    ).toBe(true);
    expect(isMfaChallengeAnswer({ access: "x", refresh: "y" })).toBe(false);
    expect(isMfaChallengeAnswer({ mfa_required: "true", challenge: CHALLENGE })).toBe(false);
    expect(isMfaChallengeAnswer(null)).toBe(false);
  });

  it("accepts only base64url challenges of the backend's length", () => {
    expect(isMfaChallenge(CHALLENGE)).toBe(true);
    expect(isMfaChallenge("short")).toBe(false);
    expect(isMfaChallenge("a".repeat(129))).toBe(false);
    expect(isMfaChallenge(`${"a".repeat(20)};path=/`)).toBe(false);
  });
});

describe("the challenge cookie", () => {
  it("never outlives five minutes, even if the backend says longer", () => {
    expect(cookieFor("2026-11-17T11:00:00Z")?.attributes.maxAge).toBe(300);
    expect(cookieFor("2026-11-17T10:01:30Z")?.attributes.maxAge).toBe(90);
  });

  it("is refused for a past or unreadable expiry and a malformed challenge", () => {
    expect(cookieFor("2026-11-17T09:59:00Z")).toBeNull();
    expect(cookieFor("soon")).toBeNull();
    expect(
      mfaChallengeCookie({
        secure: false,
        answer: { challenge: "<bad>", challenge_expires_at: "2026-11-17T10:05:00Z" },
        next: "/admin",
        nowMs: NOW,
      }),
    ).toBeNull();
  });

  it("keeps next only when it stays in the panel", () => {
    const opened = (next: unknown) =>
      openPendingMfa(cookieFor("2026-11-17T10:05:00Z", next)?.value, NOW)?.next;
    expect(opened("/admin/staff?q=a")).toBe("/admin/staff?q=a");
    expect(opened("https://evil.example/")).toBe("/admin");
    expect(opened("/admin/mfa")).toBe("/admin");
    expect(opened("/admin/login")).toBe("/admin");
  });

  it("reads as gone once expired, tampered or not ours", () => {
    const value = cookieFor("2026-11-17T10:05:00Z")!.value;
    expect(openPendingMfa(value, Date.parse("2026-11-17T10:05:01Z"))).toBeNull();
    expect(openPendingMfa("not-base64-json", NOW)).toBeNull();
    expect(openPendingMfa(undefined, NOW)).toBeNull();
    const forged = Buffer.from(JSON.stringify({ c: "x", e: NOW + 1000, n: "/admin" })).toString(
      "base64url",
    );
    expect(openPendingMfa(forged, NOW)).toBeNull();
    // An expiry planted far ahead is capped (the backend's TTL plus a minute of skew).
    const far = Buffer.from(
      JSON.stringify({ c: CHALLENGE, e: NOW + 86_400_000, n: "/admin" }),
    ).toString("base64url");
    expect(openPendingMfa(far, NOW)?.expiresAtMs).toBe(NOW + 360_000);
  });

  it("is expired with the same name, path and SameSite", () => {
    const sets: unknown[] = [];
    clearMfaChallengeCookie({ set: (...args) => sets.push(args) }, true);
    expect(sets).toEqual([
      [
        "__Secure-gd_mfa_challenge",
        "",
        { httpOnly: true, secure: true, sameSite: "strict", path: "/admin/mfa", maxAge: 0 },
      ],
    ]);
  });

  it("does not carry the challenge in the way back", () => {
    expect(backToSignIn("/admin/staff", false)).toBe("/admin/login?next=%2Fadmin%2Fstaff");
    expect(backToSignIn("//evil", true)).toBe("/admin/login?next=%2Fadmin&notice=mfa_expired");
  });
});

describe("the step page and the proxy", () => {
  const base = {
    method: "GET",
    search: "",
    mode: "api" as const,
    accessToken: undefined,
    hasBackoff: false,
    hasCsrf: false,
    nowMs: NOW,
  };

  it("lets /admin/mfa through without a session, with no-referrer and a csrf cookie", () => {
    expect(decideProxy({ ...base, pathname: "/admin/mfa" })).toEqual({
      kind: "pass",
      mintCsrf: true,
      noReferrer: true,
    });
    expect(decideProxy({ ...base, pathname: "/admin/mfa/x" }).kind).toBe("refresh");
  });

  it("is never a landing page after sign-in", () => {
    expect(safeNext("/admin/mfa")).toBe("/admin");
    expect(safeNext("/admin/mfa?x=1")).toBe("/admin");
    expect(safeNext("/admin/mfa-help")).toBe("/admin/mfa-help");
  });
});
