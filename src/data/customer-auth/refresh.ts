import { createHash } from "node:crypto";

import { accessCookieMaxAge } from "@/data/auth/cookies";
import type { RefreshCallResult } from "@/data/auth/refresh-outcome";

/**
 * Customer refresh (contract §2.1.6): the refresh token ROTATES on every
 * call, and presenting a replaced token after the server's 120 s grace
 * replay revokes the whole session (`refresh_reused`). A browser easily
 * fires several requests at once when the access token lapses (RSC
 * prefetches of every visible link, two tabs, a Server Action and a
 * navigation), so the BFF runs refreshes **single-flight**:
 *
 * - concurrent refreshes of one token share one API call and its outcome;
 * - a successful rotation is remembered for `memoMs` (60 s, inside the
 *   server's 120 s grace window), so a request that still carried the old
 *   cookie — sent before the browser stored the new one — gets the same new
 *   tokens instead of presenting the old token again.
 *
 * The coordinator is per server process. Several instances behind a load
 * balancer stay correct through the server's grace replay (step 5a: the same
 * old token answers the same new tokens for 120 s), they just do not share
 * the round trip. Pure apart from `node:crypto`; the API call and the clock
 * are injected, so every branch is unit-tested.
 */

export interface CustomerTokens {
  access: string;
  accessExpiresAt: string;
  refresh: string;
  refreshExpiresAt: string;
}

export type CustomerRefreshOutcome =
  | { kind: "ok"; tokens: CustomerTokens }
  /** The session is over (401 of any code, a refused body or device): clear the cookies. */
  | { kind: "ended"; code: string }
  /** 429, 5xx, a timeout or an unusable answer: keep the cookies, try again later. */
  | { kind: "transient"; retryAfter: number | undefined };

function readTokens(body: unknown): CustomerTokens | null {
  if (typeof body !== "object" || body === null) return null;
  const record = body as Record<string, unknown>;
  const { access, refresh } = record;
  const accessExpiresAt = record.access_expires_at;
  const refreshExpiresAt = record.refresh_expires_at;
  if (
    typeof access !== "string" ||
    typeof refresh !== "string" ||
    typeof accessExpiresAt !== "string" ||
    typeof refreshExpiresAt !== "string" ||
    refresh.length === 0
  ) {
    return null;
  }
  return { access, accessExpiresAt, refresh, refreshExpiresAt };
}

function errorCode(body: unknown): string {
  if (typeof body === "object" && body !== null) {
    const code = (body as Record<string, unknown>).code;
    if (typeof code === "string" && code.length > 0) return code;
  }
  return "not_authenticated";
}

export function classifyCustomerRefresh(
  result: RefreshCallResult,
  nowMs: number,
): CustomerRefreshOutcome {
  if (result.status === 200) {
    const tokens = readTokens(result.body);
    const usable =
      tokens !== null &&
      accessCookieMaxAge(tokens.access, tokens.accessExpiresAt, nowMs) > 0 &&
      Date.parse(tokens.refreshExpiresAt) > nowMs;
    // An undecodable or already expired answer is an API hiccup, not the end
    // of the session: the old refresh token is still inside the grace window.
    if (!tokens || !usable) return { kind: "transient", retryAfter: undefined };
    return { kind: "ok", tokens };
  }
  // 401: SESSION_EXPIRED, SESSION_REPLACED, password_changed, not_authenticated
  // (unknown token, device mismatch). 400: a malformed body or the device
  // headers refused (`device_required`). Neither gets better by retrying.
  if (result.status === 400 || result.status === 401 || result.status === 403) {
    return { kind: "ended", code: errorCode(result.body) };
  }
  return { kind: "transient", retryAfter: result.retryAfter };
}

export function tokenHash(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("base64url");
}

/** Calls `POST auth/refresh/` with the given token (device headers bound by the caller's request). */
export type RefreshCall = (refresh: string) => Promise<RefreshCallResult>;

export interface RefreshCoordinatorOptions {
  now?: () => number;
  /** How long a successful rotation answers repeats of the old token. Keep it below the server's 120 s grace. */
  memoMs?: number;
  /** Bound on remembered rotations (oldest dropped first). */
  maxEntries?: number;
}

export interface RefreshCoordinator {
  /**
   * Rotates `token` once: callers that arrive while a rotation of the same
   * token runs share it (the first caller's `call` is used), and callers
   * within `memoMs` after a success get its tokens. `device` (this browser's
   * device id) is part of the key: a stolen refresh token replayed from
   * another device id never receives the tokens the real browser obtained —
   * it goes to the API, which checks the device itself.
   */
  refresh(token: string, call: RefreshCall, device?: string): Promise<CustomerRefreshOutcome>;
  /** Forgets everything (tests, and after a logout of that token). */
  forget(token?: string): void;
}

export function createRefreshCoordinator(
  options: RefreshCoordinatorOptions = {},
): RefreshCoordinator {
  const now = options.now ?? Date.now;
  const memoMs = options.memoMs ?? 60_000;
  const maxEntries = options.maxEntries ?? 1_000;
  const inFlight = new Map<string, Promise<CustomerRefreshOutcome>>();
  const recent = new Map<string, { outcome: CustomerRefreshOutcome; at: number }>();

  function remember(key: string, outcome: CustomerRefreshOutcome): void {
    if (outcome.kind !== "ok") return;
    recent.delete(key);
    recent.set(key, { outcome, at: now() });
    while (recent.size > maxEntries) {
      const oldest = recent.keys().next().value;
      if (oldest === undefined) break;
      recent.delete(oldest);
    }
  }

  async function run(token: string, call: RefreshCall): Promise<CustomerRefreshOutcome> {
    let result: RefreshCallResult;
    try {
      result = await call(token);
    } catch {
      return { kind: "transient", retryAfter: undefined };
    }
    return classifyCustomerRefresh(result, now());
  }

  return {
    refresh(token, call, device = "") {
      const key = `${tokenHash(token)}:${tokenHash(device)}`;
      const memo = recent.get(key);
      if (memo) {
        const tokens = memo.outcome.kind === "ok" ? memo.outcome.tokens : null;
        const fresh =
          now() - memo.at < memoMs &&
          tokens !== null &&
          accessCookieMaxAge(tokens.access, tokens.accessExpiresAt, now()) > 0;
        if (fresh) return Promise.resolve(memo.outcome);
        recent.delete(key);
      }
      const running = inFlight.get(key);
      if (running) return running;
      const promise = run(token, call).then((outcome) => {
        remember(key, outcome);
        return outcome;
      });
      inFlight.set(key, promise);
      void promise.finally(() => inFlight.delete(key));
      return promise;
    },
    forget(token) {
      if (token === undefined) {
        recent.clear();
        inFlight.clear();
        return;
      }
      const prefix = `${tokenHash(token)}:`;
      for (const key of [...recent.keys()]) if (key.startsWith(prefix)) recent.delete(key);
    },
  };
}
