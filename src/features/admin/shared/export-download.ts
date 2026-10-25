import { NETWORK_ERROR_MESSAGE } from "./action-client";

/**
 * The client side of the export routes (`/admin/<section>/export?…`). The
 * file is fetched (same origin, the session cookie rides along) and handed to
 * the browser as a download only when the route answers 2xx; any refusal —
 * 429 throttled, 400 `export_too_large`, 401, 502 — comes back as the
 * envelope's Uzbek `message` for a toast, so the admin never lands on a raw
 * JSON page.
 */

export const EXPORT_FAILED_MESSAGE = "Eksport bajarilmadi. Qayta urinib ko‘ring.";

export type ExportDownload =
  { ok: true; blob: Blob; filename: string } | { ok: false; status: number; message: string };

const SAFE_NAME = /^[A-Za-z0-9][A-Za-z0-9._-]{0,120}$/;

/** `filename="…"` of the route's (already sanitised) `Content-Disposition`, re-checked; else `fallback`. */
export function downloadFilename(contentDisposition: string | null, fallback: string): string {
  const match = contentDisposition ? /filename="?([^";]+)"?/i.exec(contentDisposition) : null;
  const name = match?.[1]?.trim() ?? "";
  return SAFE_NAME.test(name) && !name.includes("..") ? name : fallback;
}

/** `/admin/products/export?…&format=xlsx` → `mahsulotlar.xlsx`-style fallback `eksport.xlsx`. */
export function fallbackFilename(href: string): string {
  return /[?&]format=xlsx\b/.test(href) ? "eksport.xlsx" : "eksport.csv";
}

export async function fetchExport(
  href: string,
  fetchImpl: typeof fetch = (input, init) => fetch(input, init),
): Promise<ExportDownload> {
  let response: Response;
  try {
    response = await fetchImpl(href, {
      method: "GET",
      credentials: "same-origin",
      cache: "no-store",
      headers: { Accept: "*/*" },
    });
  } catch {
    return { ok: false, status: 0, message: NETWORK_ERROR_MESSAGE };
  }
  if (response.ok) {
    try {
      const blob = await response.blob();
      return {
        ok: true,
        blob,
        filename: downloadFilename(
          response.headers.get("content-disposition"),
          fallbackFilename(href),
        ),
      };
    } catch {
      return { ok: false, status: 0, message: NETWORK_ERROR_MESSAGE };
    }
  }
  let message = EXPORT_FAILED_MESSAGE;
  try {
    const body: unknown = await response.json();
    if (
      typeof body === "object" &&
      body !== null &&
      "message" in body &&
      typeof body.message === "string" &&
      body.message.trim()
    ) {
      message = body.message;
    }
  } catch {
    // Not an envelope (an edge page): keep the generic message.
  }
  return { ok: false, status: response.status, message };
}
