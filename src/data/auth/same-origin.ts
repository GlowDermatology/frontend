/**
 * Same-origin check for the GET refresh route. `SameSite=Strict` cookies are
 * absent on cross-site navigations anyway; this check decides whether to
 * serve the same-origin bounce page instead of touching the session.
 */
export interface SameOriginInput {
  secFetchSite: string | null;
  origin: string | null;
  referer: string | null;
  /** `X-Forwarded-Host` (set by the edge) or `Host`. */
  requestHost: string | null;
  /** Exact `host[:port]` entries from `GLOWDERMA_ALLOWED_ORIGINS`. */
  allowedOrigins: readonly string[];
}

function hostOf(url: string): string | null {
  try {
    return new URL(url).host.toLowerCase();
  } catch {
    return null;
  }
}

export function isSameOriginRequest(input: SameOriginInput): boolean {
  const site = input.secFetchSite?.toLowerCase();
  if (site !== undefined && site !== null && site !== "same-origin" && site !== "none") {
    return false;
  }
  const allowed = new Set(input.allowedOrigins.map((entry) => entry.toLowerCase()));
  if (input.requestHost) allowed.add(input.requestHost.toLowerCase());
  for (const candidate of [input.origin, input.referer]) {
    if (!candidate || candidate === "null") {
      if (candidate === "null") return false;
      continue;
    }
    const host = hostOf(candidate);
    if (!host || !allowed.has(host)) return false;
  }
  return true;
}
