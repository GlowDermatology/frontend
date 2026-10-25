import { accessCookieMaxAge } from "./cookies";
import { REFRESH_LEAD_SECONDS } from "./jwt";

/**
 * Classifies Django's answer to `POST auth/refresh/` into the three outcomes
 * the refresh route handler acts on (spec "Refresh-route outcomes"). Pure, so
 * every branch is unit-tested without a server.
 */

/** What the route learned from the API call: a status plus the parsed body, or status 0 for transport failures. */
export interface RefreshCallResult {
  status: number;
  body?: unknown;
  retryAfter?: number;
}

export type RefreshOutcome =
  | {
      kind: "ok";
      access: string;
      accessExpiresAt: string;
      /** Seconds the new access cookie may live. */
      maxAge: number;
      /** The new token is already inside the refresh lead time: set the backoff cookie to avoid a loop. */
      nearExpiry: boolean;
    }
  | { kind: "ended" }
  | { kind: "transient"; retryAfter: number | undefined };

function readBody(body: unknown): { access: string; accessExpiresAt: string } | null {
  if (typeof body !== "object" || body === null) return null;
  const { access, access_expires_at: accessExpiresAt } = body as Record<string, unknown>;
  if (typeof access !== "string" || typeof accessExpiresAt !== "string") return null;
  return { access, accessExpiresAt };
}

export function classifyRefresh(
  result: RefreshCallResult,
  nowMs: number,
  leadSeconds = REFRESH_LEAD_SECONDS,
): RefreshOutcome {
  if (result.status === 200) {
    const parsed = readBody(result.body);
    const maxAge = parsed ? accessCookieMaxAge(parsed.access, parsed.accessExpiresAt, nowMs) : 0;
    // A token that is undecodable or already expired is unusable: treat it like
    // an API hiccup rather than ending the session.
    if (!parsed || maxAge <= 0) return { kind: "transient", retryAfter: undefined };
    return {
      kind: "ok",
      access: parsed.access,
      accessExpiresAt: parsed.accessExpiresAt,
      maxAge,
      nearExpiry: maxAge <= leadSeconds,
    };
  }
  if (result.status === 400 || result.status === 401) return { kind: "ended" };
  return { kind: "transient", retryAfter: result.retryAfter };
}
