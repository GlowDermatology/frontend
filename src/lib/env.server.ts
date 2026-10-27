import "server-only";

export type DataSource = "mock" | "api";

function read(name: string): string | undefined {
  const value = process.env[name];
  return value === undefined || value === "" ? undefined : value;
}

function required(name: string): string {
  const value = read(name);
  if (!value) throw new Error(`${name} is not set`);
  return value;
}

/**
 * Server-side configuration of the admin BFF. Every value is read lazily so
 * `next build` never needs the production environment; a missing required
 * variable fails the first request that uses it, with the variable's name.
 */
export const serverEnv = {
  /** `mock` (default) serves the fixtures; `api` talks to Django. */
  dataSource(): DataSource {
    const value = read("GLOWDERMA_DATA_SOURCE") ?? "mock";
    if (value !== "mock" && value !== "api") {
      throw new Error(`GLOWDERMA_DATA_SOURCE must be "mock" or "api", got "${value}"`);
    }
    return value;
  },
  /** Django origin without a trailing slash, e.g. `http://api:8000`. */
  apiUrl(): string {
    return required("GLOWDERMA_API_URL").replace(/\/+$/, "");
  },
  /** Shared secret sent as `X-GD-Internal-Secret` (equals Django's INTERNAL_API_SECRET). */
  internalSecret(): string {
    return required("GLOWDERMA_INTERNAL_SECRET");
  },
  /** Whether session cookies carry `Secure` and the `__Secure-` prefix (HTTPS deployments). */
  cookieSecure(): boolean {
    const value = read("GLOWDERMA_COOKIE_SECURE");
    if (value === undefined) return process.env.NODE_ENV === "production";
    return value === "true" || value === "1";
  },
  /**
   * `GLOWDERMA_MEDIA_HOSTS` as `host[:port]` entries (the hosts `next/image`
   * may load, see `next.config.ts`); empty when unset.
   */
  mediaHosts(): string[] {
    return (read("GLOWDERMA_MEDIA_HOSTS") ?? "")
      .split(",")
      .map((entry) => entry.trim().toLowerCase())
      .filter(Boolean);
  },
};
