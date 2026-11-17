import type { Route } from "next";

import type { Schemas } from "../api/types";

import type { CookieSink, SessionCookie } from "./cookies";
import { safeNext } from "./next-param";

/**
 * The sign-in's second step (DESIGN §E "MFA", contract §2.1 `auth/mfa/verify/`). With the admin
 * panel MFA on, `auth/login/` and `auth/oauth/{provider}/` answer
 * `{mfa_required: true, challenge, challenge_expires_at}` instead of a session. The challenge is a
 * bearer secret for five minutes, so it never reaches the browser's JavaScript, the address bar,
 * the history or a log: the first step stores it, with the validated `next` and the expiry, in one
 * HttpOnly, `SameSite=Strict` cookie scoped to the step page (`Path=/admin/mfa`: only that page and
 * its Server Actions receive it) that lives no longer than the challenge. The page reads the expiry
 * (for its countdown) and `next` server-side; the verify action reads the challenge.
 *
 * Pure (no `server-only`, no Next request APIs): the proxy, the actions, the OAuth callback and
 * the tests share it.
 */

/** The step page. Public: the proxy lets it through without a session. */
export const MFA_STEP_PATH = "/admin/mfa";

/** `CHALLENGE_TTL_SECONDS` of the backend: the cookie never outlives it. */
export const MFA_CHALLENGE_MAX_AGE_SECONDS = 5 * 60;

/** `CHALLENGE_MAX_LENGTH` of the backend (`secrets.token_urlsafe(32)` is 43 characters). */
export const MFA_CHALLENGE_MAX_LENGTH = 128;
const CHALLENGE_PATTERN = /^[A-Za-z0-9_-]{16,128}$/;

/** The answer of a first step that needs the code (`MfaChallenge` of `AdminLoginResult`). */
export type MfaChallengeAnswer = Schemas["MfaChallenge"];

/** Tells the challenge apart from a session answer (`AdminLoginResult` = oneOf, by `mfa_required`). */
export function isMfaChallengeAnswer(data: unknown): data is MfaChallengeAnswer {
  if (typeof data !== "object" || data === null) return false;
  const value = data as Record<string, unknown>;
  return (
    value.mfa_required === true &&
    typeof value.challenge === "string" &&
    typeof value.challenge_expires_at === "string"
  );
}

/** A challenge as the backend issues it (base64url, 16–128 characters); anything else is dropped. */
export function isMfaChallenge(value: unknown): value is string {
  return typeof value === "string" && CHALLENGE_PATTERN.test(value);
}

export function mfaChallengeCookieName(secure: boolean): string {
  return `${secure ? "__Secure-" : ""}gd_mfa_challenge`;
}

/** What the cookie holds. */
export interface PendingMfa {
  challenge: string;
  /** Epoch ms of the challenge's expiry (`challenge_expires_at`, capped at five minutes from now). */
  expiresAtMs: number;
  /** Where the panel continues once the code is accepted (validated with `safeNext`). */
  next: Route;
}

function encode(pending: PendingMfa): string {
  const json = JSON.stringify({ c: pending.challenge, e: pending.expiresAtMs, n: pending.next });
  return Buffer.from(json, "utf8").toString("base64url");
}

/**
 * The pending step from a cookie value, or `null` when it is missing, malformed or expired. `next`
 * is validated again (the cookie is HttpOnly, but a value planted from a sibling subdomain must
 * not lead off the panel either).
 */
export function openPendingMfa(value: unknown, nowMs: number): PendingMfa | null {
  if (typeof value !== "string" || value.length === 0 || value.length > 4096) return null;
  let raw: unknown;
  try {
    raw = JSON.parse(Buffer.from(value, "base64url").toString("utf8"));
  } catch {
    return null;
  }
  if (typeof raw !== "object" || raw === null) return null;
  const data = raw as Record<string, unknown>;
  if (!isMfaChallenge(data.c)) return null;
  if (typeof data.e !== "number" || !Number.isFinite(data.e) || data.e <= nowMs) return null;
  // Never trust an expiry further away than the backend's TTL (plus a minute of clock skew).
  const expiresAtMs = Math.min(data.e, nowMs + (MFA_CHALLENGE_MAX_AGE_SECONDS + 60) * 1000);
  return { challenge: data.c, expiresAtMs, next: safeNext(data.n) };
}

/**
 * The challenge cookie for a first step's answer, or `null` when the answer is unusable (a
 * malformed challenge, an expiry in the past or unreadable): the caller treats that like an
 * outage. HttpOnly, `SameSite=Strict`, `Path=/admin/mfa`, Max-Age = the challenge's remaining
 * lifetime (≤ 5 min).
 */
export function mfaChallengeCookie(input: {
  secure: boolean;
  answer: Pick<MfaChallengeAnswer, "challenge" | "challenge_expires_at">;
  next: unknown;
  nowMs: number;
}): SessionCookie | null {
  if (!isMfaChallenge(input.answer.challenge)) return null;
  const parsed = Date.parse(input.answer.challenge_expires_at);
  if (Number.isNaN(parsed)) return null;
  const expiresAtMs = Math.min(parsed, input.nowMs + MFA_CHALLENGE_MAX_AGE_SECONDS * 1000);
  const maxAge = Math.floor((expiresAtMs - input.nowMs) / 1000);
  if (maxAge <= 0) return null;
  return {
    name: mfaChallengeCookieName(input.secure),
    value: encode({
      challenge: input.answer.challenge,
      expiresAtMs,
      next: safeNext(input.next),
    }),
    attributes: {
      httpOnly: true,
      secure: input.secure,
      sameSite: "strict",
      path: MFA_STEP_PATH,
      maxAge,
    },
  };
}

/** Expires the challenge cookie (success, an invalid challenge, «back to sign-in»). */
export function clearMfaChallengeCookie(sink: CookieSink, secure: boolean): void {
  sink.set(mfaChallengeCookieName(secure), "", {
    httpOnly: true,
    secure,
    sameSite: "strict",
    path: MFA_STEP_PATH,
    maxAge: 0,
  });
}

/** `/admin/login?next=…` (with `notice=mfa_expired` when the step ended on its own). */
export function backToSignIn(next: string, expired: boolean): Route {
  const params = new URLSearchParams({ next: safeNext(next) });
  if (expired) params.set("notice", "mfa_expired");
  return `/admin/login?${params.toString()}` as Route;
}
