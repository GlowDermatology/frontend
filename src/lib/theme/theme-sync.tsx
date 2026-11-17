"use client";

import { useEffect } from "react";

import { DARK_QUERY } from "./theme-cookie";
import { applyTheme, currentResolvedTheme, notifyThemeChange } from "./theme-store";

/**
 * Keeps `<html data-theme>` and `<meta name="theme-color">` in step with the saved choice
 * (mounted once per document, next to the inline `THEME_SCRIPT`). It re-applies the theme on
 * hydration (and in `global-error`, which has no head script), when the device switches between
 * light and dark (the `system` choice), when the tab comes back into view (the other part of the
 * site may have changed the cookie) and when a page is restored from the back/forward cache.
 */
export function ThemeSync() {
  useEffect(() => {
    const sync = () => {
      applyTheme(currentResolvedTheme());
      notifyThemeChange();
    };
    sync();
    const media = typeof window.matchMedia === "function" ? window.matchMedia(DARK_QUERY) : null;
    const onMedia = () => {
      applyTheme(currentResolvedTheme(), { instant: true });
      notifyThemeChange();
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") sync();
    };
    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) sync();
    };
    media?.addEventListener("change", onMedia);
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("pageshow", onPageShow);
    return () => {
      media?.removeEventListener("change", onMedia);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("pageshow", onPageShow);
    };
  }, []);
  return null;
}
