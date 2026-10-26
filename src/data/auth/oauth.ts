import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

import type { Route } from "next";

import { safeNext } from "./next-param";

/**
 * Staff social sign-in, BFF side (contract §2.1, M0b). Django holds the
 * client secrets and exchanges the code; this server runs the browser
 * redirect:
 *
 * 1. `GET /admin/auth/oauth/{provider}/start` creates a flow (`newFlow`: a
 *    random `state`, a PKCE verifier whose S256 challenge goes into the
 *    authorize URL, a `nonce` for Google), seals it into one HttpOnly cookie
 *    (`Path=/admin/auth`, `SameSite=Lax` so it survives the provider's
 *    top-level redirect back, ≤10 min) and redirects to the provider.
 * 2. `GET /admin/auth/oauth/{provider}/callback` opens the cookie, compares
 *    the returned `state` in constant time, clears the cookie and posts the
 *    code with the verifier to Django.
 *
 * The cookie is signed (HMAC-SHA256, `sealFlow`/`openFlow`), so a value
 * planted from a sibling subdomain cannot carry an attacker's verifier; the
 * signature also binds the provider, the intent and the `next` path.
 *
 * Pure module (Node crypto only, no Next request APIs) so every rule is
 * unit-tested; the route handlers in `src/app/admin/auth/oauth/[provider]/`
 * wire it to the request.
 */

export const OAUTH_PROVIDERS = ["google", "facebook"] as const;
export type OAuthProvider = (typeof OAUTH_PROVIDERS)[number];
export type OAuthIntent = "login" | "link";
export type OAuthMode = "fake" | "live";

export const OAUTH_PROVIDER_LABEL: Record<OAuthProvider, string> = {
  google: "Google",
  facebook: "Facebook",
};

/** Lifetime of the flow cookie and of the flow itself (the contract allows ≤10 min). */
export const OAUTH_FLOW_MAX_AGE_SECONDS = 10 * 60;
/** How long a signed `?oauth=` notice stays displayable after the callback issued it. */
export const OAUTH_NOTICE_MAX_AGE_SECONDS = 5 * 60;
export const OAUTH_COOKIE_PATH = "/admin/auth";
/** The Graph API version of the backend's live Facebook adapter (`FACEBOOK_GRAPH_VERSION`). */
export const FACEBOOK_DIALOG_VERSION = "v21.0";

export function isOAuthProvider(value: unknown): value is OAuthProvider {
  return typeof value === "string" && (OAUTH_PROVIDERS as readonly string[]).includes(value);
}

export function oauthCookieName(secure: boolean): string {
  return `${secure ? "__Secure-" : ""}gd_oauth`;
}

/* --- configuration ------------------------------------------------------- */

export interface OAuthConfig {
  mode: OAuthMode;
  /** Enabled providers in a stable order (Google first); empty = no buttons. */
  providers: OAuthProvider[];
  /** The public client id per provider (`fake` in fake mode). */
  clientIds: Partial<Record<OAuthProvider, string>>;
  /** Configuration problems worth a server warning (unknown names, live mode without a client id). */
  warnings: string[];
}

type Env = Record<string, string | undefined>;

/**
 * `GLOWDERMA_OAUTH_PROVIDERS` (comma list of `google`, `facebook`),
 * `GLOWDERMA_OAUTH_MODE` (`fake` | `live`, default `fake`) and the public
 * client ids `GLOWDERMA_GOOGLE_CLIENT_ID` / `GLOWDERMA_FACEBOOK_APP_ID`.
 * Unknown names are ignored, and in live mode a provider without its client
 * id is left out (both reported in `warnings`), so a typo hides a button
 * instead of breaking the login page.
 */
export function readOAuthConfig(env: Env): OAuthConfig {
  const warnings: string[] = [];
  const rawMode = (env.GLOWDERMA_OAUTH_MODE ?? "").trim().toLowerCase();
  let mode: OAuthMode = "fake";
  if (rawMode === "live") mode = "live";
  else if (rawMode !== "" && rawMode !== "fake") {
    warnings.push(`GLOWDERMA_OAUTH_MODE must be "fake" or "live", got "${rawMode}"; using fake`);
  }
  const requested = new Set<OAuthProvider>();
  for (const entry of (env.GLOWDERMA_OAUTH_PROVIDERS ?? "").split(",")) {
    const name = entry.trim().toLowerCase();
    if (!name) continue;
    if (isOAuthProvider(name)) requested.add(name);
    else warnings.push(`GLOWDERMA_OAUTH_PROVIDERS: unknown provider "${name}" ignored`);
  }
  const liveIds: Record<OAuthProvider, string | undefined> = {
    google: env.GLOWDERMA_GOOGLE_CLIENT_ID?.trim() || undefined,
    facebook: env.GLOWDERMA_FACEBOOK_APP_ID?.trim() || undefined,
  };
  const providers: OAuthProvider[] = [];
  const clientIds: Partial<Record<OAuthProvider, string>> = {};
  for (const provider of OAUTH_PROVIDERS) {
    if (!requested.has(provider)) continue;
    const clientId = mode === "fake" ? "fake" : liveIds[provider];
    if (!clientId) {
      const variable =
        provider === "google" ? "GLOWDERMA_GOOGLE_CLIENT_ID" : "GLOWDERMA_FACEBOOK_APP_ID";
      warnings.push(`${provider} sign-in is disabled: ${variable} is not set (live mode)`);
      continue;
    }
    providers.push(provider);
    clientIds[provider] = clientId;
  }
  return { mode, providers, clientIds, warnings };
}

/* --- random values and PKCE --------------------------------------------- */

/** 32 random bytes as base64url (43 characters, inside PKCE's 43..128). */
export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}

/** RFC 7636 S256: `BASE64URL(SHA256(ASCII(verifier)))`. */
export function pkceChallenge(verifier: string): string {
  return createHash("sha256").update(verifier, "ascii").digest("base64url");
}

/** RFC 7636 §4.1: 43..128 unreserved characters. */
export function isPkceVerifier(value: unknown): value is string {
  return typeof value === "string" && /^[A-Za-z0-9\-._~]{43,128}$/.test(value);
}

/* --- the flow cookie ---------------------------------------------------- */

export interface OAuthFlow {
  provider: OAuthProvider;
  intent: OAuthIntent;
  state: string;
  verifier: string;
  nonce: string;
  /** Validated in-panel path to land on after a login (`safeNext`). */
  next: Route;
  /** Epoch ms when the flow started. */
  issuedAt: number;
}

export function newFlow(input: {
  provider: OAuthProvider;
  intent: OAuthIntent;
  next: unknown;
  nowMs: number;
}): OAuthFlow {
  return {
    provider: input.provider,
    intent: input.intent,
    state: randomToken(),
    verifier: randomToken(),
    nonce: randomToken(),
    next: input.intent === "link" ? "/admin/settings" : safeNext(input.next),
    issuedAt: input.nowMs,
  };
}

function mac(key: Buffer, purpose: string, payload: string): string {
  return createHmac("sha256", key).update(`${purpose}\n${payload}`).digest("base64url");
}

function equalStrings(a: string, b: string): boolean {
  const left = Buffer.from(a, "utf8");
  const right = Buffer.from(b, "utf8");
  return left.length === right.length && timingSafeEqual(left, right);
}

function seal(key: Buffer, purpose: string, value: unknown): string {
  const payload = Buffer.from(JSON.stringify(value), "utf8").toString("base64url");
  return `${payload}.${mac(key, purpose, payload)}`;
}

function unseal(key: Buffer, purpose: string, token: unknown): unknown {
  if (typeof token !== "string" || token.length > 4096) return null;
  const dot = token.indexOf(".");
  if (dot <= 0 || dot !== token.lastIndexOf(".")) return null;
  const payload = token.slice(0, dot);
  if (!equalStrings(token.slice(dot + 1), mac(key, purpose, payload))) return null;
  try {
    return JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as unknown;
  } catch {
    return null;
  }
}

const FLOW_PURPOSE = "glowderma/oauth-flow/v1";
const NOTICE_PURPOSE = "glowderma/oauth-notice/v1";

export function sealFlow(flow: OAuthFlow, key: Buffer): string {
  return seal(key, FLOW_PURPOSE, flow);
}

/**
 * The flow from a cookie value, or `null` when the value is missing, not
 * signed with `key`, malformed or older than `OAUTH_FLOW_MAX_AGE_SECONDS`
 * (the cookie's Max-Age is the browser's half of the same rule).
 */
export function openFlow(value: unknown, key: Buffer, nowMs: number): OAuthFlow | null {
  const raw = unseal(key, FLOW_PURPOSE, value);
  if (typeof raw !== "object" || raw === null) return null;
  const flow = raw as Record<string, unknown>;
  if (!isOAuthProvider(flow.provider)) return null;
  if (flow.intent !== "login" && flow.intent !== "link") return null;
  if (typeof flow.state !== "string" || flow.state.length < 16) return null;
  if (!isPkceVerifier(flow.verifier)) return null;
  if (typeof flow.nonce !== "string" || flow.nonce.length < 16) return null;
  if (typeof flow.issuedAt !== "number" || !Number.isFinite(flow.issuedAt)) return null;
  const age = nowMs - flow.issuedAt;
  if (age < -60_000 || age > OAUTH_FLOW_MAX_AGE_SECONDS * 1000) return null;
  return {
    provider: flow.provider,
    intent: flow.intent,
    state: flow.state,
    verifier: flow.verifier,
    nonce: flow.nonce,
    next: flow.intent === "link" ? "/admin/settings" : safeNext(flow.next),
    issuedAt: flow.issuedAt,
  };
}

export type CallbackCheck =
  | { ok: true; flow: OAuthFlow; code: string }
  | {
      ok: false;
      reason: "no_flow" | "provider_mismatch" | "state_mismatch" | "denied" | "no_code";
      /** Where the error goes: the account card for a link flow, else the login page. */
      intent: OAuthIntent;
    };

/**
 * The callback's admission rules, in order: a valid flow cookie, the same
 * provider as the route, the returned `state` equal to the cookie's
 * (constant time), no provider `error`, a non-empty `code`.
 */
export function checkCallback(input: {
  flow: OAuthFlow | null;
  provider: OAuthProvider;
  state: string | null;
  code: string | null;
  error: string | null;
}): CallbackCheck {
  const { flow } = input;
  if (!flow) return { ok: false, reason: "no_flow", intent: "login" };
  const intent = flow.intent;
  if (flow.provider !== input.provider) return { ok: false, reason: "provider_mismatch", intent };
  if (!input.state || !equalStrings(input.state, flow.state)) {
    return { ok: false, reason: "state_mismatch", intent };
  }
  if (input.error) return { ok: false, reason: "denied", intent };
  if (!input.code || input.code.length > 2048) return { ok: false, reason: "no_code", intent };
  return { ok: true, flow, code: input.code };
}

/** Uzbek messages for the callback failures this server detects itself. */
export const CALLBACK_MESSAGES = {
  no_flow: "Kirish so‘rovi eskirgan. Qayta urinib ko‘ring.",
  provider_mismatch: "Kirish so‘rovi eskirgan. Qayta urinib ko‘ring.",
  state_mismatch: "Kirish so‘rovi eskirgan. Qayta urinib ko‘ring.",
  denied: "Ijtimoiy tarmoq orqali kirish bekor qilindi.",
  no_code: "Ijtimoiy tarmoq orqali kirish amalga oshmadi.",
} as const satisfies Record<Extract<CallbackCheck, { ok: false }>["reason"], string>;

/* --- the authorize URL --------------------------------------------------- */

export interface AuthorizeInput {
  provider: OAuthProvider;
  mode: OAuthMode;
  clientId: string;
  redirectUri: string;
  state: string;
  verifier: string;
  nonce: string;
}

/**
 * Where `start` sends the browser. Fake mode uses the built-in page
 * `/admin/auth/oauth/{provider}/fake` (same query as the live endpoint, so
 * the flow is exercised end to end); live mode the providers' endpoints with
 * the S256 challenge (and the nonce for Google's ID token).
 */
export function authorizeUrl(input: AuthorizeInput): string {
  const params = new URLSearchParams({
    client_id: input.clientId,
    redirect_uri: input.redirectUri,
    response_type: "code",
    state: input.state,
    code_challenge: pkceChallenge(input.verifier),
    code_challenge_method: "S256",
  });
  if (input.provider === "google") {
    params.set("scope", "openid email");
    params.set("nonce", input.nonce);
    params.set("prompt", "select_account");
  } else {
    params.set("scope", "email");
  }
  if (input.mode === "fake") return `/admin/auth/oauth/${input.provider}/fake?${params}`;
  if (input.provider === "google") {
    return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
  }
  return `https://www.facebook.com/${FACEBOOK_DIALOG_VERSION}/dialog/oauth?${params}`;
}

/**
 * The `nonce` posted to Django. Live mode sends exactly the string that went
 * into the authorize URL (Django compares it byte-wise with the ID token).
 * The backend's fake Google cannot see that URL and accepts only
 * `nonce-<subject>` or the wildcard `*`, so fake mode posts `*`; Facebook
 * takes no nonce.
 */
export function nonceForExchange(flow: OAuthFlow, mode: OAuthMode): string | undefined {
  if (flow.provider !== "google") return undefined;
  return mode === "fake" ? "*" : flow.nonce;
}

/* --- redirect_uri -------------------------------------------------------- */

/**
 * The public origin the provider redirects back to. It is never taken from
 * an arbitrary Host header: the request host is used only when it is one of
 * `GLOWDERMA_ALLOWED_ORIGINS`, otherwise the first entry; only with an empty
 * list (local development) does the request host stand alone. The scheme
 * follows `GLOWDERMA_COOKIE_SECURE` (HTTPS deployments set it).
 */
export function publicOrigin(input: {
  requestHost: string | null;
  allowedOrigins: readonly string[];
  secure: boolean;
}): string | null {
  const host = input.requestHost?.trim().toLowerCase() || null;
  const allowed = input.allowedOrigins.map((entry) => entry.toLowerCase());
  const chosen = host && allowed.includes(host) ? host : (allowed[0] ?? host);
  if (!chosen) return null;
  return `${input.secure ? "https" : "http"}://${chosen}`;
}

export function oauthRedirectUri(origin: string, provider: OAuthProvider): string {
  return `${origin}/admin/auth/oauth/${provider}/callback`;
}

/* --- signed notices (callback → login page / account card) --------------- */

export interface OAuthNotice {
  kind: "error" | "linked" | "demo";
  provider: OAuthProvider;
  /** Uzbek text: the backend's message for an error. */
  message: string;
  issuedAt: number;
}

/**
 * The callback reports its outcome through `?oauth=<token>` on the login
 * page or the settings page. The token is signed, so a crafted link cannot
 * make the panel display arbitrary text, and it expires after
 * `OAUTH_NOTICE_MAX_AGE_SECONDS`, so a bookmarked URL does not repeat it.
 */
export function sealNotice(notice: OAuthNotice, key: Buffer): string {
  return seal(key, NOTICE_PURPOSE, notice);
}

export function openNotice(token: unknown, key: Buffer, nowMs: number): OAuthNotice | null {
  const raw = unseal(key, NOTICE_PURPOSE, Array.isArray(token) ? token[0] : token);
  if (typeof raw !== "object" || raw === null) return null;
  const notice = raw as Record<string, unknown>;
  if (notice.kind !== "error" && notice.kind !== "linked" && notice.kind !== "demo") return null;
  if (!isOAuthProvider(notice.provider)) return null;
  if (typeof notice.message !== "string" || notice.message.length > 500) return null;
  if (typeof notice.issuedAt !== "number") return null;
  const age = nowMs - notice.issuedAt;
  if (age < -60_000 || age > OAUTH_NOTICE_MAX_AGE_SECONDS * 1000) return null;
  return {
    kind: notice.kind,
    provider: notice.provider,
    message: notice.message,
    issuedAt: notice.issuedAt,
  };
}

/**
 * The HMAC key for the flow cookie and the notices. Derived from
 * `GLOWDERMA_INTERNAL_SECRET` (set in api mode and shared by every instance)
 * with a fixed label, so the secret itself never signs anything; without it
 * (mock mode, tests) a per-process random key is used, which is enough for a
 * single demo instance.
 */
export function deriveOAuthKey(internalSecret: string | undefined): Buffer {
  if (internalSecret) {
    return createHmac("sha256", internalSecret).update("glowderma/oauth-key/v1").digest();
  }
  processKey ??= randomBytes(32);
  return processKey;
}

let processKey: Buffer | undefined;
