import { createHash } from "node:crypto";

import { describe, expect, it } from "vitest";

import { ApiError } from "../api/errors";
import { clearOAuthFlowCookie, oauthFlowCookie, type CookieAttributes } from "./cookies";
import {
  CALLBACK_MESSAGES,
  ConsumedStates,
  OAUTH_FLOW_MAX_AGE_SECONDS,
  OAUTH_NOTICE_MAX_MESSAGE_LENGTH,
  authorizeUrl,
  checkCallback,
  consumedStateKey,
  deriveOAuthKey,
  flowExpiresAt,
  isPkceVerifier,
  newFlow,
  nonceForExchange,
  oauthRedirectUri,
  openFlow,
  openNotice,
  pkceChallenge,
  publicOrigin,
  readOAuthConfig,
  sealFlow,
  sealNotice,
  sessionMatches,
  type OAuthFlow,
} from "./oauth";
import { OAUTH_FAILED_MESSAGE, oauthErrorMessage } from "./oauth-errors";

const now = Date.parse("2026-10-26T10:00:00+05:00");
const key = deriveOAuthKey("test-internal-secret");
const otherKey = deriveOAuthKey("another-secret");

function envelope(code: string, message: string) {
  return { code, message, errors: [], request_id: "r1" };
}

describe("readOAuthConfig", () => {
  it("is empty (no buttons) by default and fake by default", () => {
    expect(readOAuthConfig({})).toEqual({
      mode: "fake",
      providers: [],
      clientIds: {},
      warnings: [],
    });
  });

  it("parses the provider list, ignores unknown names and keeps Google first", () => {
    const config = readOAuthConfig({ GLOWDERMA_OAUTH_PROVIDERS: " Facebook, google ,github,," });
    expect(config.providers).toEqual(["google", "facebook"]);
    expect(config.clientIds).toEqual({ google: "fake", facebook: "fake" });
    expect(config.warnings).toEqual([
      'GLOWDERMA_OAUTH_PROVIDERS: unknown provider "github" ignored',
    ]);
  });

  it("needs the public client id per provider in live mode", () => {
    const config = readOAuthConfig({
      GLOWDERMA_OAUTH_MODE: "live",
      GLOWDERMA_OAUTH_PROVIDERS: "google,facebook",
      GLOWDERMA_GOOGLE_CLIENT_ID: "123.apps.googleusercontent.com",
    });
    expect(config.mode).toBe("live");
    expect(config.providers).toEqual(["google"]);
    expect(config.clientIds).toEqual({ google: "123.apps.googleusercontent.com" });
    expect(config.warnings[0]).toMatch(/GLOWDERMA_FACEBOOK_APP_ID/);
  });

  it("falls back to fake for an unknown mode, with a warning", () => {
    const config = readOAuthConfig({ GLOWDERMA_OAUTH_MODE: "prod" });
    expect(config.mode).toBe("fake");
    expect(config.warnings).toHaveLength(1);
  });

  it("offers no provider in a production build unless the mode is set explicitly", () => {
    const unset = readOAuthConfig({ NODE_ENV: "production", GLOWDERMA_OAUTH_PROVIDERS: "google" });
    expect(unset.providers).toEqual([]);
    expect(unset.warnings[0]).toMatch(/GLOWDERMA_OAUTH_MODE is not set in a production build/);
    const invalid = readOAuthConfig({
      NODE_ENV: "production",
      GLOWDERMA_OAUTH_MODE: "prod",
      GLOWDERMA_OAUTH_PROVIDERS: "google",
    });
    expect(invalid.providers).toEqual([]);
    const explicit = readOAuthConfig({
      NODE_ENV: "production",
      GLOWDERMA_OAUTH_MODE: "fake",
      GLOWDERMA_OAUTH_PROVIDERS: "google",
    });
    expect(explicit.providers).toEqual(["google"]);
    expect(explicit.warnings).toEqual([]);
    // No providers requested: nothing to warn about.
    expect(readOAuthConfig({ NODE_ENV: "production" }).warnings).toEqual([]);
    // Development keeps the fake default.
    expect(
      readOAuthConfig({ NODE_ENV: "development", GLOWDERMA_OAUTH_PROVIDERS: "google" }).providers,
    ).toEqual(["google"]);
  });
});

describe("state, PKCE and nonce", () => {
  it("generates distinct high-entropy values and a valid RFC 7636 verifier", () => {
    const a = newFlow({ provider: "google", intent: "login", next: "/admin/orders", nowMs: now });
    const b = newFlow({ provider: "google", intent: "login", next: "/admin/orders", nowMs: now });
    expect(a.state).not.toBe(b.state);
    expect(a.verifier).not.toBe(b.verifier);
    expect(a.nonce).not.toBe(b.nonce);
    expect(a.state).not.toBe(a.verifier);
    for (const value of [a.state, a.verifier, a.nonce])
      expect(value).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(isPkceVerifier(a.verifier)).toBe(true);
    expect(a.next).toBe("/admin/orders");
  });

  it("computes the S256 challenge (RFC 7636 appendix B vector)", () => {
    expect(pkceChallenge("dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk")).toBe(
      "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM",
    );
    const verifier = newFlow({
      provider: "facebook",
      intent: "login",
      next: null,
      nowMs: now,
    }).verifier;
    expect(pkceChallenge(verifier)).toBe(createHash("sha256").update(verifier).digest("base64url"));
  });

  it("rejects verifiers outside 43..128 unreserved characters", () => {
    expect(isPkceVerifier("a".repeat(42))).toBe(false);
    expect(isPkceVerifier("a".repeat(129))).toBe(false);
    expect(isPkceVerifier(`${"a".repeat(42)}+`)).toBe(false);
    expect(isPkceVerifier("a".repeat(128))).toBe(true);
  });

  it("validates next like the login page and pins a link flow to the settings page", () => {
    const flow = (next: unknown, intent: "login" | "link" = "login") =>
      newFlow({ provider: "google", intent, next, nowMs: now }).next;
    expect(flow("/admin/payments?refund=needs_action")).toBe("/admin/payments?refund=needs_action");
    expect(flow("https://evil.example/admin")).toBe("/admin");
    expect(flow("//evil.example")).toBe("/admin");
    expect(flow("/admin/../x")).toBe("/admin");
    expect(flow("/admin/login")).toBe("/admin");
    expect(flow("/admin/auth/oauth/google/start")).toBe("/admin");
    expect(flow("/admin/orders", "link")).toBe("/admin/settings");
  });

  it("posts the stored nonce live, the backend fake's wildcard in fake mode, nothing for Facebook", () => {
    const google = newFlow({ provider: "google", intent: "login", next: null, nowMs: now });
    const facebook = newFlow({ provider: "facebook", intent: "login", next: null, nowMs: now });
    expect(nonceForExchange(google, "live")).toBe(google.nonce);
    expect(nonceForExchange(google, "fake")).toBe("*");
    expect(nonceForExchange(facebook, "live")).toBeUndefined();
  });
});

describe("the sealed flow cookie", () => {
  const flow = newFlow({ provider: "google", intent: "link", next: null, nowMs: now });

  it("round-trips with the same key", () => {
    expect(openFlow(sealFlow(flow, key), key, now + 1000)).toEqual(flow);
  });

  it("refuses another key, a tampered payload or signature, and garbage", () => {
    const sealed = sealFlow(flow, key);
    expect(openFlow(sealed, otherKey, now)).toBeNull();
    const [payload, signature] = sealed.split(".") as [string, string];
    const forged: OAuthFlow = { ...flow, intent: "login", next: "/admin/orders" };
    const forgedPayload = Buffer.from(JSON.stringify(forged)).toString("base64url");
    expect(openFlow(`${forgedPayload}.${signature}`, key, now)).toBeNull();
    expect(openFlow(`${payload}.${signature.slice(0, -2)}AA`, key, now)).toBeNull();
    expect(openFlow(`${payload}.${signature}.x`, key, now)).toBeNull();
    for (const value of [undefined, "", "abc", "a.b", 42, "x".repeat(5000)]) {
      expect(openFlow(value, key, now)).toBeNull();
    }
  });

  it("expires after ten minutes", () => {
    const sealed = sealFlow(flow, key);
    expect(openFlow(sealed, key, now + OAUTH_FLOW_MAX_AGE_SECONDS * 1000)).not.toBeNull();
    expect(openFlow(sealed, key, now + OAUTH_FLOW_MAX_AGE_SECONDS * 1000 + 1)).toBeNull();
    expect(openFlow(sealed, key, now - 120_000)).toBeNull();
  });

  it("is HttpOnly, SameSite=Lax, Path=/admin/auth and lives 10 minutes", () => {
    expect(oauthFlowCookie({ secure: false, value: "v" })).toEqual({
      name: "gd_oauth",
      value: "v",
      attributes: {
        httpOnly: true,
        secure: false,
        sameSite: "lax",
        path: "/admin/auth",
        maxAge: 600,
      },
    });
    const secure = oauthFlowCookie({ secure: true, value: "v" });
    expect(secure.name).toBe("__Secure-gd_oauth");
    expect(secure.attributes.secure).toBe(true);
  });

  it("is cleared with the same name, path and SameSite", () => {
    const calls: Array<{ name: string; value: string; options: Partial<CookieAttributes> }> = [];
    clearOAuthFlowCookie(
      { set: (name, value, options) => calls.push({ name, value, options }) },
      true,
    );
    expect(calls).toEqual([
      {
        name: "__Secure-gd_oauth",
        value: "",
        options: { httpOnly: true, secure: true, sameSite: "lax", path: "/admin/auth", maxAge: 0 },
      },
    ]);
  });

  it("derives a stable key from the internal secret, distinct per secret", () => {
    expect(deriveOAuthKey("s").equals(deriveOAuthKey("s"))).toBe(true);
    expect(deriveOAuthKey("s").equals(deriveOAuthKey("t"))).toBe(false);
    expect(deriveOAuthKey("s").equals(Buffer.from("s"))).toBe(false);
    expect(deriveOAuthKey(undefined)).toHaveLength(32);
  });
});

describe("checkCallback", () => {
  const flow = newFlow({ provider: "google", intent: "login", next: "/admin/orders", nowMs: now });
  const base = { flow, provider: "google" as const, state: flow.state, code: "c", error: null };

  it("accepts the matching state and a code", () => {
    expect(checkCallback(base)).toEqual({ ok: true, flow, code: "c" });
  });

  it("refuses a missing flow, another provider, a wrong or missing state, a denial or no code", () => {
    expect(checkCallback({ ...base, flow: null })).toMatchObject({
      ok: false,
      reason: "no_flow",
      intent: "login",
    });
    expect(checkCallback({ ...base, provider: "facebook" })).toMatchObject({
      reason: "provider_mismatch",
    });
    expect(checkCallback({ ...base, state: `${flow.state.slice(0, -1)}x` })).toMatchObject({
      reason: "state_mismatch",
    });
    expect(checkCallback({ ...base, state: null })).toMatchObject({ reason: "state_mismatch" });
    expect(checkCallback({ ...base, state: "short" })).toMatchObject({ reason: "state_mismatch" });
    expect(checkCallback({ ...base, error: "access_denied" })).toMatchObject({ reason: "denied" });
    expect(checkCallback({ ...base, code: "" })).toMatchObject({ reason: "no_code" });
    expect(checkCallback({ ...base, code: "x".repeat(2049) })).toMatchObject({ reason: "no_code" });
  });

  it("checks the state before reading a provider error (a forged error cannot be shown)", () => {
    expect(checkCallback({ ...base, state: "forged-state-value-123", error: "x" })).toMatchObject({
      reason: "state_mismatch",
    });
  });

  it("reports the flow's next with every failure of a valid flow, /admin without one", () => {
    expect(checkCallback({ ...base, error: "access_denied" })).toMatchObject({
      next: "/admin/orders",
    });
    expect(checkCallback({ ...base, state: "wrong-state-value-1234" })).toMatchObject({
      next: "/admin/orders",
    });
    expect(checkCallback({ ...base, provider: "facebook" })).toMatchObject({
      next: "/admin/orders",
    });
    expect(checkCallback({ ...base, code: null })).toMatchObject({ next: "/admin/orders" });
    expect(checkCallback({ ...base, flow: null })).toMatchObject({ next: "/admin" });
  });

  it("consumes the state only after it matched, and refuses a replay", () => {
    const store = new ConsumedStates();
    const consume = (f: OAuthFlow) =>
      store.consume(consumedStateKey(key, f.state), flowExpiresAt(f), now);
    expect(checkCallback({ ...base, state: "wrong-state-value-1234", consume })).toMatchObject({
      reason: "state_mismatch",
    });
    expect(store.size).toBe(0);
    expect(checkCallback({ ...base, consume })).toMatchObject({ ok: true });
    expect(checkCallback({ ...base, consume })).toMatchObject({ ok: false, reason: "replayed" });
    expect(CALLBACK_MESSAGES.replayed).toBe(CALLBACK_MESSAGES.state_mismatch);
  });

  it("sends a link flow's failure back to the account card", () => {
    const link = newFlow({ provider: "google", intent: "link", next: null, nowMs: now });
    expect(checkCallback({ ...base, flow: link, state: "wrong-state-value-1234" })).toMatchObject({
      intent: "link",
    });
    expect(CALLBACK_MESSAGES.state_mismatch).toBe("Kirish so‘rovi eskirgan. Qayta urinib ko‘ring.");
  });
});

describe("ConsumedStates", () => {
  it("remembers a key until its expiry, then forgets it", () => {
    const store = new ConsumedStates();
    expect(store.consume("a", now + 1000, now)).toBe(true);
    expect(store.consume("a", now + 1000, now + 999)).toBe(false);
    expect(store.consume("a", now + 5000, now + 1000)).toBe(true);
    expect(store.size).toBe(1);
  });

  it("stays bounded by dropping the oldest entries", () => {
    const store = new ConsumedStates(2);
    store.consume("a", now + 1000, now);
    store.consume("b", now + 1000, now);
    store.consume("c", now + 1000, now);
    expect(store.size).toBe(2);
    expect(store.consume("c", now + 1000, now)).toBe(false);
  });

  it("keys on an HMAC of the state, never the state itself", () => {
    const flow = newFlow({ provider: "google", intent: "login", next: null, nowMs: now });
    const stored = consumedStateKey(key, flow.state);
    expect(stored).not.toContain(flow.state);
    expect(stored).toBe(consumedStateKey(key, flow.state));
    expect(stored).not.toBe(consumedStateKey(otherKey, flow.state));
    expect(flowExpiresAt(flow)).toBe(now + OAUTH_FLOW_MAX_AGE_SECONDS * 1000 + 60_000);
  });
});

describe("link flow session binding", () => {
  it("seals the sid of a link flow and opens it again; a login flow carries none", () => {
    const link = newFlow({ provider: "google", intent: "link", next: null, nowMs: now, sid: "A" });
    expect(openFlow(sealFlow(link, key), key, now)?.sid).toBe("A");
    const login = newFlow({
      provider: "google",
      intent: "login",
      next: null,
      nowMs: now,
      sid: "A",
    });
    expect(login.sid).toBeUndefined();
  });

  it("matches only a token of the same session", () => {
    const link = newFlow({ provider: "google", intent: "link", next: null, nowMs: now, sid: "A" });
    expect(sessionMatches(link, "A")).toBe(true);
    expect(sessionMatches(link, "B")).toBe(false);
    expect(sessionMatches(link, null)).toBe(false);
    const unbound = newFlow({ provider: "google", intent: "link", next: null, nowMs: now });
    expect(sessionMatches(unbound, "A")).toBe(false);
  });
});

describe("authorizeUrl and redirect_uri", () => {
  const input = {
    clientId: "cid",
    redirectUri: "https://admin.glowderma.uz/admin/auth/oauth/google/callback",
    state: "s".repeat(43),
    verifier: "v".repeat(43),
    nonce: "n".repeat(43),
  };

  it("sends fake mode to the built-in page with the live query", () => {
    const url = new URL(
      authorizeUrl({ ...input, provider: "google", mode: "fake" }),
      "http://x.test",
    );
    expect(url.pathname).toBe("/admin/auth/oauth/google/fake");
    expect(url.searchParams.get("state")).toBe(input.state);
    expect(url.searchParams.get("nonce")).toBe(input.nonce);
    expect(url.searchParams.get("code_challenge")).toBe(pkceChallenge(input.verifier));
    expect(url.searchParams.get("code_challenge_method")).toBe("S256");
    expect(url.searchParams.get("redirect_uri")).toBe(input.redirectUri);
  });

  it("builds Google's and Facebook's live authorize URLs", () => {
    const google = new URL(authorizeUrl({ ...input, provider: "google", mode: "live" }));
    expect(google.origin + google.pathname).toBe("https://accounts.google.com/o/oauth2/v2/auth");
    expect(google.searchParams.get("scope")).toBe("openid email");
    expect(google.searchParams.get("response_type")).toBe("code");
    expect(google.searchParams.get("client_id")).toBe("cid");
    const facebook = new URL(authorizeUrl({ ...input, provider: "facebook", mode: "live" }));
    expect(facebook.origin + facebook.pathname).toBe("https://www.facebook.com/v21.0/dialog/oauth");
    expect(facebook.searchParams.get("scope")).toBe("email");
    expect(facebook.searchParams.has("nonce")).toBe(false);
    expect(facebook.searchParams.get("code_challenge")).toBe(pkceChallenge(input.verifier));
  });

  it("takes the public origin from the allow-list, never from an arbitrary Host", () => {
    const allowed = ["admin.glowderma.uz", "admin2.glowderma.uz"];
    expect(
      publicOrigin({ requestHost: "admin2.glowderma.uz", allowedOrigins: allowed, secure: true }),
    ).toBe("https://admin2.glowderma.uz");
    expect(
      publicOrigin({ requestHost: "evil.example", allowedOrigins: allowed, secure: true }),
    ).toBe("https://admin.glowderma.uz");
    expect(publicOrigin({ requestHost: "localhost:3113", allowedOrigins: [], secure: false })).toBe(
      "http://localhost:3113",
    );
    expect(publicOrigin({ requestHost: null, allowedOrigins: [], secure: false })).toBeNull();
    expect(oauthRedirectUri("http://localhost:3113", "facebook")).toBe(
      "http://localhost:3113/admin/auth/oauth/facebook/callback",
    );
  });
});

describe("signed notices", () => {
  const notice = {
    kind: "error" as const,
    provider: "google" as const,
    message: "Bu hisob administrator sifatida ro‘yxatdan o‘tmagan.",
    issuedAt: now,
  };

  it("round-trips, and refuses forged, foreign or stale tokens", () => {
    const token = sealNotice(notice, key);
    expect(openNotice(token, key, now + 1000)).toEqual(notice);
    expect(openNotice([token], key, now)).toEqual(notice);
    expect(openNotice(token, otherKey, now)).toBeNull();
    expect(openNotice(token, key, now + 5 * 60 * 1000 + 1)).toBeNull();
    const forged = Buffer.from(
      JSON.stringify({ ...notice, message: "Parolingizni yuboring" }),
    ).toString("base64url");
    expect(openNotice(`${forged}.${token.split(".")[1]}`, key, now)).toBeNull();
    expect(openNotice(undefined, key, now)).toBeNull();
  });

  it("cannot be replayed as a flow cookie (domain-separated signatures)", () => {
    const flow = newFlow({ provider: "google", intent: "login", next: null, nowMs: now });
    expect(openNotice(sealFlow(flow, key), key, now)).toBeNull();
  });
});

describe("oauthErrorMessage (callback error mapping)", () => {
  it("shows the backend's Uzbek message for the contract's refusals", () => {
    for (const [status, code, message] of [
      [401, "social_account_not_allowed", "Bu hisob administrator sifatida ro‘yxatdan o‘tmagan."],
      [400, "oauth_exchange_failed", "Ijtimoiy tarmoq orqali kirish amalga oshmadi."],
      [503, "provider_unavailable", "Tashqi xizmat javob bermadi. Qayta urinib ko‘ring."],
      [409, "conflict", "Bu provayder allaqachon bog‘langan."],
      [409, "conflict", "Bu ijtimoiy hisob allaqachon bog‘langan."],
      [404, "not_found", "Topilmadi."],
    ] as const) {
      expect(oauthErrorMessage(new ApiError(status, envelope(code, message)))).toBe(message);
    }
  });

  it("maps field errors, throttling, transport and non-envelope answers", () => {
    expect(
      oauthErrorMessage(
        new ApiError(400, {
          ...envelope("validation_error", "Maydonlarni tekshiring."),
          errors: [{ field: "redirect_uri", code: "invalid", message: "Noto‘g‘ri qiymat." }],
        }),
      ),
    ).toBe(OAUTH_FAILED_MESSAGE);
    expect(
      oauthErrorMessage(new ApiError(429, envelope("throttled", "x"), { retryAfter: 12 })),
    ).toBe("Juda ko‘p urinish. 12 soniyadan so‘ng qayta urinib ko‘ring.");
    expect(oauthErrorMessage(new ApiError(0, envelope("timeout", "x")))).toBe(
      "API bilan bog‘lanib bo‘lmadi.",
    );
    expect(oauthErrorMessage(new ApiError(502, envelope("http_502", "Kutilmagan xato.")))).toBe(
      "API bilan bog‘lanib bo‘lmadi.",
    );
    expect(oauthErrorMessage(new Error("boom"))).toBe("Kutilmagan xato.");
  });

  it("never returns a message longer than a notice can carry", () => {
    const longest = "x".repeat(OAUTH_NOTICE_MAX_MESSAGE_LENGTH);
    expect(oauthErrorMessage(new ApiError(400, envelope("oauth_exchange_failed", longest)))).toBe(
      longest,
    );
    const tooLong = longest + "x";
    const message = oauthErrorMessage(
      new ApiError(400, envelope("oauth_exchange_failed", tooLong)),
    );
    expect(message).toBe(OAUTH_FAILED_MESSAGE);
    const token = sealNotice({ kind: "error", provider: "google", message, issuedAt: now }, key);
    expect(openNotice(token, key, now)?.message).toBe(OAUTH_FAILED_MESSAGE);
  });
});
