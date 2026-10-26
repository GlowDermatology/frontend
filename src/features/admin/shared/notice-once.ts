/**
 * One-shot notices that arrive in the URL (`?oauth=` from the OAuth callback):
 * the page drops the token with `router.replace`, but a re-render that still
 * carries the old props (a `router.refresh()` racing the replace, React's
 * StrictMode remount in development, a back navigation) must not toast it
 * again. A notice is claimed once per id in this tab: in memory, and in
 * `sessionStorage` so a reload of a cached entry does not repeat it either.
 */

const claimed = new Set<string>();
const PREFIX = "gd-notice:";

type NoticeStorage = Pick<Storage, "getItem" | "setItem">;

function sessionStore(): NoticeStorage | null {
  try {
    return typeof window === "undefined" ? null : window.sessionStorage;
  } catch {
    return null;
  }
}

/** `true` the first time `id` is claimed in this tab, `false` afterwards. */
export function claimNotice(
  id: string,
  storage: NoticeStorage | null = sessionStore(),
  memory: Set<string> = claimed,
): boolean {
  if (memory.has(id)) return false;
  memory.add(id);
  try {
    if (storage?.getItem(PREFIX + id)) return false;
    storage?.setItem(PREFIX + id, "1");
  } catch {
    // Storage blocked or full: the in-memory claim still holds for this page.
  }
  return true;
}

/** `pathname?query` without `param` (for `router.replace`). */
export function withoutParam(pathname: string, search: string, param: string): string {
  const params = new URLSearchParams(search);
  params.delete(param);
  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}
