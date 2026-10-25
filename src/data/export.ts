import "server-only";

import { apiExport } from "./api/catalog";
import type { QueryValue } from "./api/client";
import { isApiError } from "./api/errors";
import {
  contentDisposition,
  EXPORT_CONTENT_TYPE,
  exportFilename,
  type ExportFormat,
} from "./api/mappers/export";
import { verifyStaff } from "./auth";
import { csvResponse, type CsvCell } from "./export-csv";
import { dataSource } from "./source";

/**
 * Shared body of the export route handlers (`/admin/<section>/export`,
 * contract §1.8 and §7.15). The staff session is required (a download gets
 * 401 JSON, not a redirect); in api mode Django's file is streamed through
 * with its content type and a sanitised `Content-Disposition`, in mock mode a
 * local CSV is built from the fixtures. A filename from the query string is
 * never used.
 */

export interface ExportRouteOptions {
  resource: "products" | "categories" | "banners";
  /** Contract §1.8 `<name>`: `mahsulotlar`, `kategoriyalar`, `bannerlar`. */
  name: string;
  format: ExportFormat;
  /** API filter parameters (the UI params already translated). */
  apiParams: Record<string, QueryValue>;
  /** Mock mode: the local CSV's header and rows. */
  mock: () => Promise<{ header: ReadonlyArray<string>; rows: ReadonlyArray<CsvCell[]> }>;
}

const NO_STORE = { "Cache-Control": "no-store" };

export function unauthorizedExport(): Response {
  return Response.json(
    { code: "not_authenticated", message: "Avtorizatsiya talab qilinadi.", errors: [] },
    { status: 401, headers: NO_STORE },
  );
}

export async function exportRoute(options: ExportRouteOptions): Promise<Response> {
  const session = await verifyStaff();
  if (!session.ok) return unauthorizedExport();

  if ((await dataSource()) !== "api" || session.mode !== "api") {
    const { header, rows } = await options.mock();
    return csvResponse(options.name, header, rows);
  }

  let upstream: Response;
  try {
    upstream = await apiExport(session.token, options.resource, {
      ...options.apiParams,
      export: options.format,
    });
  } catch (error) {
    if (isApiError(error)) {
      // 400 export_too_large, 401, 429 throttled, …: pass the envelope on.
      const status = error.status === 0 ? 502 : error.status;
      const headers: Record<string, string> = { ...NO_STORE };
      if (error.retryAfter !== undefined) headers["Retry-After"] = String(error.retryAfter);
      return Response.json(error.body, { status, headers });
    }
    throw error;
  }
  const filename = exportFilename(
    upstream.headers.get("content-disposition"),
    options.name,
    options.format,
  );
  const headers = new Headers(NO_STORE);
  headers.set(
    "Content-Type",
    upstream.headers.get("content-type") ?? EXPORT_CONTENT_TYPE[options.format],
  );
  headers.set("Content-Disposition", contentDisposition(filename));
  const length = upstream.headers.get("content-length");
  if (length) headers.set("Content-Length", length);
  return new Response(upstream.body, { status: 200, headers });
}
