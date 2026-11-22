"use client";

import { useSyncExternalStore } from "react";

import {
  CUSTOMER_DARK_COLOR,
  DARK_QUERY,
  THEME_COLORS,
  THEME_ROUTE,
  resolveTheme,
  themeCookieString,
  themeFromCookieHeader,
  type ResolvedTheme,
  type ThemeChoice,
} from "./theme-cookie";

/**
 * The theme preference in the browser: `useThemeChoice()` reads it (the `gd_theme` cookie, no
 * cookie = `system`), `setThemeChoice()` changes it. The cookie is the store, so the storefront
 * and the admin panel (separate documents) share one setting; `ThemeSync` re-reads it when a tab
 * comes back into view.
 *
 * The browser objects are passed in (`ThemeEnvironment`) so the functions stay testable without a
 * DOM; the exported hooks and setters use the real `window` / `document`.
 */

export interface ThemeEnvironment {
  document: Pick<
    Document,
    "cookie" | "documentElement" | "head" | "querySelectorAll" | "createElement" | "defaultView"
  >;
  matchMedia?: (query: string) => Pick<MediaQueryList, "matches">;
  location: Pick<Location, "protocol">;
  fetch?: typeof fetch;
  requestAnimationFrame?: (callback: () => void) => unknown;
}

const listeners = new Set<() => void>();

function browser(): ThemeEnvironment | null {
  if (typeof window === "undefined" || typeof document === "undefined") return null;
  return {
    document,
    matchMedia:
      typeof window.matchMedia === "function" ? window.matchMedia.bind(window) : undefined,
    location: window.location,
    fetch: typeof window.fetch === "function" ? window.fetch.bind(window) : undefined,
    requestAnimationFrame:
      typeof window.requestAnimationFrame === "function"
        ? window.requestAnimationFrame.bind(window)
        : undefined,
  };
}

export function readThemeChoice(env: ThemeEnvironment | null = browser()): ThemeChoice {
  if (!env) return "system";
  try {
    return themeFromCookieHeader(env.document.cookie);
  } catch {
    return "system";
  }
}

export function prefersDark(env: ThemeEnvironment | null = browser()): boolean {
  return env?.matchMedia?.(DARK_QUERY).matches ?? false;
}

/** The theme the page should show now. */
export function currentResolvedTheme(env: ThemeEnvironment | null = browser()): ResolvedTheme {
  return resolveTheme(readThemeChoice(env), prefersDark(env));
}

const NO_TRANSITIONS = "*,*::before,*::after{transition:none!important}";

/**
 * Puts a theme on `<html data-theme>` and on every `<meta name="theme-color">`. With `instant`,
 * colour transitions are suppressed for one frame, so a switch does not fade every border.
 */
export function applyTheme(
  theme: ResolvedTheme,
  { instant = false }: { instant?: boolean } = {},
  env: ThemeEnvironment | null = browser(),
): void {
  if (!env) return;
  const root = env.document.documentElement;
  const changed = root.getAttribute("data-theme") !== theme;
  let style: HTMLStyleElement | null = null;
  if (instant && changed && env.requestAnimationFrame) {
    style = env.document.createElement("style");
    style.setAttribute("data-theme-switch", "");
    style.textContent = NO_TRANSITIONS;
    env.document.head.appendChild(style);
  }
  if (changed) root.setAttribute("data-theme", theme);
  const color =
    theme === "dark" && root.getAttribute("data-customer-web") !== null
      ? CUSTOMER_DARK_COLOR
      : THEME_COLORS[theme];
  for (const meta of env.document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')) {
    if (meta.getAttribute("content") !== color) {
      meta.setAttribute("content", color);
    }
  }
  if (style) {
    const added = style;
    /* Reading a computed style flushes the new colours without transitions; the next frame
       restores them. */
    void env.document.defaultView?.getComputedStyle(root).color;
    env.requestAnimationFrame?.(() => added.remove());
  }
}

/** Tells every `useThemeChoice` reader to read the cookie again. */
export function notifyThemeChange(): void {
  for (const listener of listeners) listener();
}

export function subscribeTheme(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Saves a choice: applies it at once, writes the cookie, then asks the route handler to re-issue
 * it with `Set-Cookie` (best effort: offline or refused, the script-written cookie still holds).
 */
export function setThemeChoice(
  choice: ThemeChoice,
  env: ThemeEnvironment | null = browser(),
): void {
  if (!env) return;
  const secure = env.location.protocol === "https:";
  env.document.cookie = themeCookieString(choice, secure);
  applyTheme(resolveTheme(choice, prefersDark(env)), { instant: true }, env);
  notifyThemeChange();
  env
    .fetch?.(THEME_ROUTE, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ theme: choice }),
      credentials: "same-origin",
      keepalive: true,
    })
    .catch(() => undefined);
}

const serverChoice = (): ThemeChoice => "system";

/** The saved choice (`system` during the server render and hydration). */
export function useThemeChoice(): ThemeChoice {
  return useSyncExternalStore(subscribeTheme, () => readThemeChoice(), serverChoice);
}
