import "server-only";

import { serverEnv } from "@/lib/env.server";
import { mediaUrlMatches, parseMediaHost } from "@/lib/media-hosts";

/**
 * Whether `next/image` may load a media URL: its host must match one of the
 * `GLOWDERMA_MEDIA_HOSTS` entries the way `images.remotePatterns` does (an
 * entry without a port matches any port, one with a path prefix only that
 * prefix; see `src/lib/media-hosts.ts`). A URL from another host would make
 * `next/image` throw while rendering, so such a URL is dropped and the screen
 * shows its empty thumbnail frame instead (order items keep the URL that was
 * current at checkout, which may point at a host the deployment no longer
 * serves).
 */
export function isAllowedMediaUrl(url: string, hosts: ReadonlyArray<string>): boolean {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return false;
  return hosts.some((entry) => {
    try {
      return mediaUrlMatches(parsed, parseMediaHost(entry));
    } catch {
      return false; // a malformed entry allows nothing
    }
  });
}

/** The URL when `next/image` may load it (see `isAllowedMediaUrl`), else `undefined`. */
export function optimizableMediaUrl(url: string | null | undefined): string | undefined {
  if (!url) return undefined;
  return isAllowedMediaUrl(url, serverEnv.mediaHosts()) ? url : undefined;
}
