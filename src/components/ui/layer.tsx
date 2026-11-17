"use client";

import { createContext, use, type ReactNode } from "react";

/**
 * Where floating layers (select lists, popovers, menus, tooltips) are portalled.
 *
 * Radix positions them `fixed`, so the container decides only where they sit in the DOM and the
 * accessibility tree. Inside a dialog they must render inside the dialog: a portal into `<body>`
 * leaves them outside the dialog's focus scope and accessible tree (`aria-modal` hides it), and a
 * scrolling dialog body would clip them. Each dialog therefore renders a `div[data-layer-host]`
 * next to its scrolling body and provides it here.
 */
const LayerHostContext = createContext<HTMLElement | null>(null);

export function LayerHostProvider({
  host,
  children,
}: {
  /** The element portals go into (a dialog's `div[data-layer-host]`); `null` until it mounts. */
  host: HTMLElement | null;
  children: ReactNode;
}) {
  return <LayerHostContext value={host}>{children}</LayerHostContext>;
}

/**
 * The container for a Radix `Portal`: the nearest dialog's layer host, else the admin shell's
 * `<main id="admin-main">` (keeps open menus inside a landmark, axe `region`), else `undefined`
 * (Radix falls back to `<body>`). Radix mounts portals on the client only, so reading the
 * document here never affects the server render.
 */
export function usePortalContainer(): HTMLElement | undefined {
  const host = use(LayerHostContext);
  if (host) return host;
  if (typeof document === "undefined") return undefined;
  return document.getElementById("admin-main") ?? undefined;
}
