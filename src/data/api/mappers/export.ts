/**
 * Shared pieces of the export route handlers (contract §1.8, §7.15): the
 * format parameter, the content type and the response filename. The route
 * handlers stream Django's body through and never trust a filename that did
 * not come from the API (and even that one is reduced to a safe charset).
 */

export const EXPORT_FORMATS = ["csv", "xlsx"] as const;
export type ExportFormat = (typeof EXPORT_FORMATS)[number];

/** `?format=csv|xlsx` of the UI link; anything else is CSV. */
export function parseExportFormat(value: string | undefined | null): ExportFormat {
  return value === "xlsx" ? "xlsx" : "csv";
}

export const EXPORT_CONTENT_TYPE: Record<ExportFormat, string> = {
  csv: "text/csv; charset=utf-8",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
};

const SAFE_FILENAME = /^[A-Za-z0-9][A-Za-z0-9._-]{0,120}$/;

/**
 * The `filename="…"` of an upstream `Content-Disposition`, kept only when it
 * is a plain safe token with the expected extension (`mahsulotlar-20261026-0025.csv`);
 * otherwise `<fallbackName>.<format>`. Quotes, paths, separators and any
 * non-ASCII are refused rather than escaped, so the header can never be
 * broken or spoofed by the value.
 */
export function exportFilename(
  contentDisposition: string | null | undefined,
  fallbackName: string,
  format: ExportFormat,
): string {
  const fallback = `${fallbackName}.${format}`;
  if (!contentDisposition) return fallback;
  const match = /filename\*?=(?:"([^"]*)"|([^;]*))/i.exec(contentDisposition);
  const candidate = (match?.[1] ?? match?.[2] ?? "").trim();
  if (!SAFE_FILENAME.test(candidate)) return fallback;
  if (!candidate.endsWith(`.${format}`)) return fallback;
  if (candidate.includes("..")) return fallback;
  return candidate;
}

/** `attachment; filename="<safe name>"` for a name produced by `exportFilename`. */
export function contentDisposition(filename: string): string {
  return `attachment; filename="${filename}"`;
}
