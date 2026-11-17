"use client";

import { useEffect } from "react";

/**
 * The sign-in pages that opt into the cross-document view transition (`AuthLayout`): the customer
 * sign-in in each language and the four staff auth pages. Kept in step with the routes by
 * `auth.test.ts`.
 */
export const AUTH_TRANSITION_PATHS: ReadonlySet<string> = new Set([
  "/kirish",
  "/ru/sign-in",
  "/en/sign-in",
  "/admin/login",
  "/admin/mfa",
  "/admin/set-password",
  "/admin/change-password",
]);

/** Whether leaving for `url` keeps the cross-fade: only towards another sign-in page. */
export function keepsAuthTransition(url: string | null | undefined): boolean {
  if (!url) return false;
  try {
    return AUTH_TRANSITION_PATHS.has(new URL(url).pathname);
  } catch {
    return false;
  }
}

/** `pageswap` on the outgoing page: skip the transition unless the new page is a sign-in page. */
function onPageSwap(event: PageSwapEvent) {
  const transition = event.viewTransition;
  if (!transition || keepsAuthTransition(event.activation?.entry?.url)) return;
  const ignore = () => {};
  transition.ready.catch(ignore);
  transition.finished.catch(ignore);
  transition.updateCallbackDone.catch(ignore);
  transition.skipTransition();
}

let listening = false;

/**
 * The sign-in pages cross-fade into each other (`@view-transition`, emitted by `AuthLayout`), but
 * a page without the opt-in (the store, the admin panel after signing in) would abort the
 * transition with a page error. On leaving, the outgoing page skips the transition unless the new
 * one is a sign-in page too (`pageswap`, where supported). The listener stays for the document's
 * life, like the hoisted opt-in, which a client navigation away does not remove. Renders nothing.
 */
export function AuthViewTransitionGuard() {
  useEffect(() => {
    if (listening) return;
    listening = true;
    window.addEventListener("pageswap", onPageSwap);
  }, []);
  return null;
}
