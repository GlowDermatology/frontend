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
 * The cookie is signed (HMAC-SHA256, `sealFlow`/`openFlow`), so its content
 * cannot be forged or edited (provider, intent, `next`). A signature does not
 * stop a *valid* value from being planted, though: an attacker can start a
 * flow of their own and toss that cookie into a victim's browser from a
 * sibling subdomain (`Path=/admin/auth` rules out `__Host-`). Hence:
 *
 * - a link flow is bound to the session that started it: `start` verifies
 *   the session with Django and seals its `sid` (the access JWT's session id,
 *   the same for every token the non-rotating refresh token mints), and the
 *   callback links only with a token of that same `sid` (`sessionMatches`),
 *   so a planted link flow can never attach an identity to the victim's
 *   account;
 * - a state is also single use in this Next process (`ConsumedStates`): a
 *   captured cookie and callback URL replayed to the same process within the
 *   10 min, or to it after a restart, is refused. Several instances do not
 *   share that set; across them only the provider's single-use codes (live
 *   mode) and Django guard against a replay (see the README);
 * - residual risk: a planted *login* flow can still sign the victim in to
 *   the attacker's own staff account (login CSRF). Binding it to another
 *   per-browser cookie would not help against the same cookie toss; the
 *   panel shows the signed-in account's name on every screen.
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
/** The longest notice message `openNotice` displays; `oauthErrorMessage` never produces a longer one. */
export const OAUTH_NOTICE_MAX_MESSAGE_LENGTH = 500;
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

/** The warning logged (once per process) whenever fake mode runs outside development. */
export const FAKE_OUTSIDE_DEVELOPMENT_WARNING =
  "fake OAuth mode outside development: anyone can sign in as a linked subject " +
  "(GLOWDERMA_OAUTH_ALLOW_FAKE=true); never use it on a public deployment";

/**
 * `GLOWDERMA_OAUTH_PROVIDERS` (comma list of `google`, `facebook`),
 * `GLOWDERMA_OAUTH_MODE` (`fake` | `live`) and the public client ids
 * `GLOWDERMA_GOOGLE_CLIENT_ID` / `GLOWDERMA_FACEBOOK_APP_ID`.
 *
 * Fake mode signs in anyone who types a linked subject, so it is opt-in
 * everywhere but on a development or test server (`NODE_ENV` exactly
 * `development` or `test`, where an unset mode means fake). Any other
 * `NODE_ENV` — `production`, unset, or a custom value such as `staging` —
 * needs `GLOWDERMA_OAUTH_MODE=live`, or `fake` together with
 * `GLOWDERMA_OAUTH_ALLOW_FAKE=true` (which logs a warning); otherwise no
 * provider is offered. Unknown names are ignored, and in live mode a provider
 * without its client id is left out (all reported in `warnings`), so a typo
 * hides a button instead of breaking the login page.
 */
export function readOAuthConfig(env: Env): OAuthConfig {
  const warnings: string[] = [];
  const development = env.NODE_ENV === "development" || env.NODE_ENV === "test";
  const requestsProviders = (env.GLOWDERMA_OAUTH_PROVIDERS ?? "").trim() !== "";
  const disabled = (reason: string): OAuthConfig => {
    if (requestsProviders) warnings.push(`social sign-in is disabled: ${reason}`);
    return { mode: "fake", providers: [], clientIds: {}, warnings };
  };
  const rawMode = (env.GLOWDERMA_OAUTH_MODE ?? "").trim().toLowerCase();
  let mode: OAuthMode;
  if (rawMode === "live") {
    mode = "live";
  } else if (rawMode === "fake") {
    mode = "fake";
    if (!development) {
      if ((env.GLOWDERMA_OAUTH_ALLOW_FAKE ?? "").trim().toLowerCase() !== "true") {
        return disabled(
          `GLOWDERMA_OAUTH_MODE=fake outside development (NODE_ENV=${env.NODE_ENV ?? "unset"}) ` +
            "also needs GLOWDERMA_OAUTH_ALLOW_FAKE=true",
        );
      }
      if (requestsProviders) warnings.push(FAKE_OUTSIDE_DEVELOPMENT_WARNING);
    }
  } else {
    const problem =
      rawMode === ""
        ? "GLOWDERMA_OAUTH_MODE is not set"
        : `GLOWDERMA_OAUTH_MODE must be "fake" or "live", got "${rawMode}"`;
    if (!development) {
      return disabled(
        `${problem} outside development (NODE_ENV=${env.NODE_ENV ?? "unset"}); ` +
          'set "live", or "fake" with GLOWDERMA_OAUTH_ALLOW_FAKE=true for a test deployment',
      );
    }
    if (rawMode !== "") warnings.push(`${problem}; using fake`);
    mode = "fake";
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
  /**
   * The session a link flow belongs to (api mode): the `sid` claim of the
   * access token Django accepted when the flow started. Absent for a login
   * and for a demo-mode link.
   */
  sid?: string;
}

export function newFlow(input: {
  provider: OAuthProvider;
  intent: OAuthIntent;
  next: unknown;
  nowMs: number;
  sid?: string | null;
}): OAuthFlow {
  const flow: OAuthFlow = {
    provider: input.provider,
    intent: input.intent,
    state: randomToken(),
    verifier: randomToken(),
    nonce: randomToken(),
    next: input.intent === "link" ? "/admin/settings" : safeNext(input.next),
    issuedAt: input.nowMs,
  };
  if (input.intent === "link" && input.sid) flow.sid = input.sid;
  return flow;
}

/**
 * Whether a token's `sid` claim is the session the link flow was bound to
 * (constant time). A flow without a binding matches nothing.
 */
export function sessionMatches(flow: OAuthFlow, tokenSid: string | null | undefined): boolean {
  if (!flow.sid || !tokenSid) return false;
  return equalStrings(flow.sid, tokenSid);
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
  if (flow.sid !== undefined && (typeof flow.sid !== "string" || flow.sid.length > 200)) {
    return null;
  }
  const opened: OAuthFlow = {
    provider: flow.provider,
    intent: flow.intent,
    state: flow.state,
    verifier: flow.verifier,
    nonce: flow.nonce,
    next: flow.intent === "link" ? "/admin/settings" : safeNext(flow.next),
    issuedAt: flow.issuedAt,
  };
  if (flow.intent === "link" && typeof flow.sid === "string" && flow.sid) opened.sid = flow.sid;
  return opened;
}

export type CallbackCheck =
  | { ok: true; flow: OAuthFlow; code: string }
  | {
      ok: false;
      reason:
        "no_flow" | "provider_mismatch" | "state_mismatch" | "replayed" | "denied" | "no_code";
      /** Where the error goes: the account card for a link flow, else the login page. */
      intent: OAuthIntent;
      /** The flow's landing path when a valid flow existed (kept on the login page), else `/admin`. */
      next: Route;
    };

/**
 * The callback's admission rules, in order: a valid flow cookie, the same
 * provider as the route, the returned `state` equal to the cookie's
 * (constant time), a state not used before (`consume`, which also marks it
 * used), no provider `error`, a non-empty `code`.
 */
export function checkCallback(input: {
  flow: OAuthFlow | null;
  provider: OAuthProvider;
  state: string | null;
  code: string | null;
  error: string | null;
  /** Marks the flow's state as used; `false` when it already was (a replay). */
  consume?: (flow: OAuthFlow) => boolean;
}): CallbackCheck {
  const { flow } = input;
  if (!flow) return { ok: false, reason: "no_flow", intent: "login", next: "/admin" };
  const { intent, next } = flow;
  const refuse = (reason: Extract<CallbackCheck, { ok: false }>["reason"]): CallbackCheck => ({
    ok: false,
    reason,
    intent,
    next,
  });
  if (flow.provider !== input.provider) return refuse("provider_mismatch");
  if (!input.state || !equalStrings(input.state, flow.state)) return refuse("state_mismatch");
  if (input.consume && !input.consume(flow)) return refuse("replayed");
  if (input.error) return refuse("denied");
  if (!input.code || input.code.length > 2048) return refuse("no_code");
  return { ok: true, flow, code: input.code };
}

/** Uzbek messages for the callback failures this server detects itself. */
export const CALLBACK_MESSAGES = {
  no_flow: "Kirish so‘rovi eskirgan. Qayta urinib ko‘ring.",
  provider_mismatch: "Kirish so‘rovi eskirgan. Qayta urinib ko‘ring.",
  state_mismatch: "Kirish so‘rovi eskirgan. Qayta urinib ko‘ring.",
  replayed: "Kirish so‘rovi eskirgan. Qayta urinib ko‘ring.",
  denied: "Ijtimoiy tarmoq orqali kirish bekor qilindi.",
  no_code: "Ijtimoiy tarmoq orqali kirish amalga oshmadi.",
} as const satisfies Record<Extract<CallbackCheck, { ok: false }>["reason"], string>;

/* --- single use -------------------------------------------------------- */

/**
 * - `fresh`: first use, now marked used;
 * - `used`: a replay;
 * - `predates`: the flow started before this process did, so whether it was
 *   used cannot be known (a restart or a deploy forgets the set);
 * - `full`: the set holds `limit` live entries and refuses to forget any
 *   (fail closed).
 */
export type ConsumeResult = "fresh" | "used" | "predates" | "full";

/**
 * The states this process has accepted, until their flow would have expired
 * anyway. Keys are HMACs of the state (`consumedStateKey`), never the state
 * itself.
 *
 * - A live entry is never evicted: evicting one would let its cookie and
 *   callback URL be replayed. Past `limit` live entries new callbacks are
 *   refused instead (`full`); `start` throttles flows per client IP
 *   (`FlowThrottle`), so one client cannot fill the set.
 * - A flow issued before `startedAtMs` (this process's start) is refused
 *   (`predates`): after a restart nothing is known about it.
 *
 * Still per process: with several Next instances behind one origin a replay
 * can land on an instance that has not seen the state. Only a check every
 * instance shares (Django refusing a PKCE verifier it has seen) closes that;
 * see the README.
 */
export class ConsumedStates {
  private readonly entries = new Map<string, number>();
  private readonly limit: number;
  private readonly startedAtMs: number;
  private lastFullScanMs = Number.NEGATIVE_INFINITY;

  constructor(options: { limit?: number; startedAtMs?: number } = {}) {
    this.limit = options.limit ?? 100_000;
    this.startedAtMs = options.startedAtMs ?? Number.NEGATIVE_INFINITY;
  }

  /** Marks `key` used until `expiresAtMs` (see `ConsumeResult`). */
  consume(
    entry: { key: string; issuedAtMs: number; expiresAtMs: number },
    nowMs: number,
  ): ConsumeResult {
    if (entry.issuedAtMs < this.startedAtMs) return "predates";
    this.pruneHead(nowMs);
    const until = this.entries.get(entry.key);
    if (until !== undefined && until > nowMs) return "used";
    if (until !== undefined) this.entries.delete(entry.key);
    if (this.entries.size >= this.limit) {
      // Entries are inserted roughly in expiry order, so `pruneHead` may stop
      // before an expired entry further in; a full scan finds those, at most
      // once a second.
      if (nowMs - this.lastFullScanMs >= 1000) {
        this.lastFullScanMs = nowMs;
        for (const [key, expiresAt] of this.entries) {
          if (expiresAt <= nowMs) this.entries.delete(key);
        }
      }
      if (this.entries.size >= this.limit) return "full";
    }
    this.entries.set(entry.key, entry.expiresAtMs);
    return "fresh";
  }

  get size(): number {
    return this.entries.size;
  }

  /** Drops expired entries from the oldest end, up to the first live one. */
  private pruneHead(nowMs: number): void {
    for (const [key, expiresAt] of this.entries) {
      if (expiresAt > nowMs) return;
      this.entries.delete(key);
    }
  }
}

/**
 * Flows a client may start per window (`start` refuses the rest). Generous
 * for a clinic behind one NAT address, small next to `ConsumedStates`'
 * limit, so filling that set takes hundreds of addresses. Fixed windows,
 * keyed on the client IP the edge reports; bounded to `maxClients` tracked
 * addresses (past that, once expired windows are dropped, new addresses are
 * let through, and the consumed-state limit still holds).
 */
export class FlowThrottle {
  private readonly windows = new Map<string, { startedAt: number; count: number }>();
  private readonly max: number;
  private readonly windowMs: number;
  private readonly maxClients: number;

  constructor(options: { max?: number; windowMs?: number; maxClients?: number } = {}) {
    this.max = options.max ?? 30;
    this.windowMs = options.windowMs ?? 60_000;
    this.maxClients = options.maxClients ?? 50_000;
  }

  /** Counts one flow for `client`; `false` when its window is used up. */
  allow(client: string, nowMs: number): boolean {
    const current = this.windows.get(client);
    if (current && nowMs - current.startedAt < this.windowMs) {
      if (current.count >= this.max) return false;
      current.count += 1;
      return true;
    }
    if (current) this.windows.delete(client);
    if (this.windows.size >= this.maxClients) {
      for (const [key, window] of this.windows) {
        if (nowMs - window.startedAt < this.windowMs) break;
        this.windows.delete(key);
      }
      if (this.windows.size >= this.maxClients) return true;
    }
    this.windows.set(client, { startedAt: nowMs, count: 1 });
    return true;
  }
}

export function consumedStateKey(key: Buffer, state: string): string {
  return mac(key, "glowderma/oauth-state-used/v1", state);
}

/** When a flow's state may be forgotten: its own expiry (plus the clock-skew allowance). */
export function flowExpiresAt(flow: OAuthFlow): number {
  return flow.issuedAt + OAUTH_FLOW_MAX_AGE_SECONDS * 1000 + 60_000;
}

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
  if (typeof notice.message !== "string" || notice.message.length > OAUTH_NOTICE_MAX_MESSAGE_LENGTH)
    return null;
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
 * single demo instance (several demo instances behind one origin would need
 * `GLOWDERMA_INTERNAL_SECRET` set for the OAuth flow to work across them).
 */
export function deriveOAuthKey(internalSecret: string | undefined): Buffer {
  if (internalSecret) {
    return createHmac("sha256", internalSecret).update("glowderma/oauth-key/v1").digest();
  }
  // On `globalThis`, not in a module variable: the route handlers and the
  // pages are separate bundles that each evaluate this module, and both must
  // sign and verify with the same key.
  const holder = globalThis as typeof globalThis & { __glowdermaOAuthKey?: Buffer };
  holder.__glowdermaOAuthKey ??= randomBytes(32);
  return holder.__glowdermaOAuthKey;
}
