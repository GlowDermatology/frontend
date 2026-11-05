/**
 * `GLOWDERMA_MEDIA_HOSTS`: comma-separated `host[:port][/path-prefix]` entries for the media files `next/image`
 * may optimise (Django's `PUBLIC_MEDIA_BASE_URL`). Shared by `next.config.ts` (`images.remotePatterns`, at build)
 * and the server code that drops URLs `next/image` would refuse (`src/data/api/media.ts`, at runtime), so both
 * read one value the same way.
 *
 * With one origin for the site, the API and the media (`https://example.uz/media/...`), the entry must carry the
 * prefix, e.g. `example.uz/media`: the optimiser then fetches only `/media/**` from that host and cannot be used to
 * fetch any other page of the site. An entry without a port matches any port; without a prefix, any path.
 */
export type MediaHost = { hostname: string; port?: string; pathPrefix?: string };

const HOSTNAME = /^[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?$/i;
const PORT = /^\d{1,5}$/;
const PATH = /^(?:\/[A-Za-z0-9._~-]+)+$/;

export function parseMediaHost(entry: string): MediaHost {
  const value = entry.trim();
  const slash = value.indexOf("/");
  const authority = slash === -1 ? value : value.slice(0, slash);
  const path = slash === -1 ? "" : value.slice(slash).replace(/\/+$/, "");
  const [hostname, port, ...rest] = authority.split(":");
  if (
    !hostname ||
    !HOSTNAME.test(hostname) ||
    rest.length > 0 ||
    (port !== undefined && !PORT.test(port)) ||
    (path !== "" &&
      (!PATH.test(path) || path.split("/").some((segment) => segment === "." || segment === "..")))
  ) {
    throw new Error(
      `GLOWDERMA_MEDIA_HOSTS: invalid entry "${entry}" (expected host[:port][/path])`,
    );
  }
  return {
    hostname: hostname.toLowerCase(),
    ...(port === undefined ? {} : { port }),
    ...(path === "" ? {} : { pathPrefix: path }),
  };
}

export function parseMediaHosts(value: string | undefined): MediaHost[] {
  if (!value) return [];
  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map(parseMediaHost);
}

/** Whether `url` is served by `host` the way `images.remotePatterns` matches it. */
export function mediaUrlMatches(url: URL, host: MediaHost): boolean {
  return (
    url.hostname.toLowerCase() === host.hostname &&
    (host.port === undefined || host.port === url.port) &&
    (host.pathPrefix === undefined || url.pathname.startsWith(`${host.pathPrefix}/`))
  );
}

/** `images.remotePatterns` entries for `next.config.ts`. */
export function mediaRemotePatterns(value: string | undefined) {
  return parseMediaHosts(value).map(({ hostname, port, pathPrefix }) => ({
    hostname,
    ...(port === undefined ? {} : { port }),
    ...(pathPrefix === undefined ? {} : { pathname: `${pathPrefix}/**` }),
  }));
}
