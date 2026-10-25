import "server-only";

import { contentDisposition } from "./api/mappers/export";

/**
 * Local CSV files for mock mode, in the API's own format (contract §1.8):
 * UTF-8 BOM, `;` separator, CRLF, every cell double-quoted with `"` doubled,
 * a leading `'` on text cells that could be read as a formula.
 */

export type CsvCell = string | number | boolean | null | undefined;

const FORMULA_START = /^[=+\-@\t\r]/;

export function csvCell(value: CsvCell): string {
  if (value === null || value === undefined) return '""';
  if (typeof value === "number") return `"${String(value)}"`;
  if (typeof value === "boolean") return `"${value ? "Ha" : "Yo‘q"}"`;
  const safe = FORMULA_START.test(value) ? `'${value}` : value;
  return `"${safe.replace(/"/g, '""')}"`;
}

export function csvDocument(header: ReadonlyArray<string>, rows: ReadonlyArray<CsvCell[]>): string {
  return (
    "﻿" +
    [header, ...rows].map((row) => row.map((cell) => csvCell(cell)).join(";")).join("\r\n") +
    "\r\n"
  );
}

/** A CSV download response named `<name>.csv`. */
export function csvResponse(
  name: string,
  header: ReadonlyArray<string>,
  rows: ReadonlyArray<CsvCell[]>,
): Response {
  return new Response(csvDocument(header, rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": contentDisposition(`${name}.csv`),
      "Cache-Control": "no-store",
    },
  });
}

/** "2026-10-23 14:02" in Tashkent, the exports' datetime format. */
export function csvDateTime(iso: string | null): string {
  if (!iso) return "";
  const shifted = new Date(Date.parse(iso) + 5 * 60 * 60 * 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${shifted.getUTCFullYear()}-${pad(shifted.getUTCMonth() + 1)}-${pad(shifted.getUTCDate())} ${pad(shifted.getUTCHours())}:${pad(shifted.getUTCMinutes())}`;
}
