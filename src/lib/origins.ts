/**
 * Parses `GLOWDERMA_ALLOWED_ORIGINS` for `serverActions.allowedOrigins` and the
 * auth route handlers: a comma-separated list of exact `host[:port]` entries.
 * Schemes and wildcards are rejected on purpose — this list is what defeats a
 * cookie planted from a sibling subdomain, so it must never widen silently.
 */
export function parseAllowedOrigins(value: string | undefined): string[] {
  if (!value) return [];
  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      if (!/^[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?(?::\d{1,5})?$/i.test(entry)) {
        throw new Error(
          `GLOWDERMA_ALLOWED_ORIGINS: invalid entry "${entry}" (expected host[:port], no scheme or wildcard)`,
        );
      }
      return entry.toLowerCase();
    });
}
