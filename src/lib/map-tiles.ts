/**
 * `NEXT_PUBLIC_MAP_TILE_URL`: the raster tile template of the address map
 * (Leaflet `{z}/{x}/{y}`, optional `{s}` subdomain and `{r}` retina suffix).
 * Shared by `next.config.ts` (the storefront CSP `img-src`, at build) and the
 * map component (inlined into the client bundle), so both read one value the
 * same way. Unset means the OpenStreetMap tile server, whose usage policy
 * asks for the visible "© OpenStreetMap contributors" attribution.
 */
export const DEFAULT_MAP_TILE_URL = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";

/** Leaflet's default `{s}` values; the CSP lists each host, never a wildcard. */
export const MAP_TILE_SUBDOMAINS = ["a", "b", "c"] as const;

const TEMPLATE = /^(https?):\/\/([^/?#]+)(\/[^#]*)$/;
const HOST = /^(?:\{s\}\.)?[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?(?::\d{1,5})?$/i;
const LOCAL = new Set(["localhost", "127.0.0.1"]);

function fail(value: string): never {
  throw new Error(
    `NEXT_PUBLIC_MAP_TILE_URL: invalid tile template "${value}" (expected https://host/{z}/{x}/{y}.png)`,
  );
}

/**
 * The validated template: https (plain http only for localhost), a host
 * that may start with `{s}.`, and a path with `{z}`, `{x}` and `{y}`.
 * Empty or unset gives the OpenStreetMap default; anything else throws.
 */
export function parseMapTileUrl(value: string | undefined): string {
  const template = (value ?? "").trim();
  if (template === "") return DEFAULT_MAP_TILE_URL;
  const [, scheme = "", host = "", path = ""] = TEMPLATE.exec(template) ?? [];
  if (!HOST.test(host)) fail(template);
  const hostname = host
    .replace(/^\{s\}\./, "")
    .replace(/:\d+$/, "")
    .toLowerCase();
  if (scheme === "http" && !LOCAL.has(hostname)) fail(template);
  if (!["{z}", "{x}", "{y}"].every((token) => path.includes(token))) fail(template);
  return template;
}

/** The template for the browser: an invalid value (refused by the build) falls back to the default. */
export function mapTileUrl(value: string | undefined): string {
  try {
    return parseMapTileUrl(value);
  } catch {
    return DEFAULT_MAP_TILE_URL;
  }
}

/** The exact origins the tiles load from, for the CSP `img-src` (`{s}` expands to a, b, c). */
export function mapTileOrigins(value: string | undefined): string[] {
  const [, scheme = "", host = ""] = TEMPLATE.exec(parseMapTileUrl(value)) ?? [];
  if (!scheme) return [];
  const lower = host.toLowerCase();
  const hosts = lower.startsWith("{s}.")
    ? MAP_TILE_SUBDOMAINS.map((subdomain) => `${subdomain}.${lower.slice(4)}`)
    : [lower];
  return hosts.map((item) => `${scheme}://${item}`);
}
