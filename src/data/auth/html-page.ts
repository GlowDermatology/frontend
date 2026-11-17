import { NextResponse } from "next/server";

import { authDataCopy, type AuthDataCopy } from "@/domain/copy/auth";

/**
 * Minimal self-contained HTML answers of the auth route handlers (the
 * same-origin bounce, the refresh retry page, the fake OAuth provider): no
 * app chrome, no scripts, `noindex`, never cached.
 */

export const NO_STORE = { "Cache-Control": "no-store" } as const;

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const BASE_STYLE =
  "*,*::before,*::after{box-sizing:border-box}body{margin:0;min-height:100dvh;display:grid;place-items:center;font:15px/1.5 system-ui,sans-serif;background:#fbf8f2;color:#2a2418}main{max-width:360px;padding:24px;text-align:center}a{color:#7a5a14;font-weight:700}";

/**
 * `title` is escaped; `body` is trusted markup (callers escape what they interpolate). `lang` is
 * the `<html lang>` of the page's language (Uzbek by default).
 */
export function htmlPage(
  title: string,
  body: string,
  init: ResponseInit,
  extraStyle = "",
  lang = "uz",
): NextResponse {
  const html = `<!doctype html><html lang="${escapeHtml(lang)}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>${escapeHtml(title)}</title><style>${BASE_STYLE}${extraStyle}</style></head><body><main>${body}</main></body></html>`;
  return new NextResponse(html, {
    ...init,
    headers: { "Content-Type": "text/html; charset=utf-8", ...NO_STORE, ...init.headers },
  });
}

/**
 * A 200 page that re-requests `selfPath` from this origin. Used when a GET
 * arrives cross-site (a link from elsewhere, an OAuth provider's redirect):
 * SameSite=Strict session cookies are absent on such a navigation, and a
 * navigation started by this page carries them.
 */
export function sameOriginBounce(
  selfPath: string,
  title = "Glow Derma Admin",
  texts: Pick<AuthDataCopy["page"], "redirecting" | "continue"> = authDataCopy.uz.page,
  lang = "uz",
): NextResponse {
  const self = escapeHtml(selfPath);
  return htmlPage(
    title,
    `<meta http-equiv="refresh" content="0;url=${self}"><p>${escapeHtml(texts.redirecting)}</p><p><a href="${self}">${escapeHtml(texts.continue)}</a></p>`,
    { status: 200 },
    "",
    lang,
  );
}

export function seeOther(location: string): NextResponse {
  return new NextResponse(null, { status: 303, headers: { Location: location, ...NO_STORE } });
}
