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

/** Invalid `GLOWDERMA_OPS_CONSOLE_URL` values already logged (once per value per process). */
const warnedConsoleUrls = new Set<string>();

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
  /**
   * Mock mode only: whether the demo's signed-in account is a superuser
   * (`GLOWDERMA_MOCK_SUPERUSER`, default true). `false` shows the ordinary
   * admin's view of the notifications page (no test, approve, cancel or stop
   * controls). Ignored in api mode, where `auth/me/` decides.
   */
  mockSuperuser(): boolean {
    const value = read("GLOWDERMA_MOCK_SUPERUSER");
    if (value === undefined) return true;
    return value === "true" || value === "1";
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
  /**
   * `GLOWDERMA_OPS_CONSOLE_URL`: the base of Django's ops console (e.g.
   * `https://ops.glowderma.uz/django-admin/`), where the store settings,
   * contacts and legal texts are edited; `null` when unset. An invalid
   * value does not fail the page: it is logged once and treated as unset.
   */
  opsConsoleUrl(): string | null {
    const value = read("GLOWDERMA_OPS_CONSOLE_URL");
    if (value === undefined) return null;
    const url = parseOpsConsoleUrl(value);
    if (url === null && !warnedConsoleUrls.has(value)) {
      warnedConsoleUrls.add(value);
      console.error(
        "[env] GLOWDERMA_OPS_CONSOLE_URL must be an absolute http(s) URL without credentials, query or fragment; ignoring it.",
      );
    }
    return url;
  },
};

/**
 * The ops console base URL normalised to end with `/` (so relative paths
 * such as `settings/` resolve under it), or `null` when `value` is not an
 * absolute `http`/`https` URL, carries credentials, a query or a fragment.
 */
export function parseOpsConsoleUrl(value: string): string | null {
  const trimmed = value.trim();
  if (!/^https?:\/\//i.test(trimmed)) return null;
  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return null;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return null;
  if (!url.hostname || url.username || url.password) return null;
  if (url.search || url.hash || trimmed.includes("?") || trimmed.includes("#")) return null;
  if (!url.pathname.endsWith("/")) url.pathname = `${url.pathname}/`;
  return url.toString();
}
