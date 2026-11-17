import "server-only";

import type { Locale } from "@/lib/i18n/locales";

import { contentDisposition } from "./api/mappers/export";
import { dataCopy } from "./copy";

/**
 * Local CSV files for mock mode, in the API's own format (contract §1.8):
 * UTF-8 BOM, `;` separator, CRLF, every cell double-quoted with `"` doubled,
 * a leading `'` on text cells that could be read as a formula — except a
 * value that is exactly an E.164 phone (`+` then 7–15 digits, no leading
 * zero), which stays plain text like the API's.
 */

export type CsvCell = string | number | boolean | null | undefined;

const FORMULA_START = /^[=+\-@\t\r]/;
const E164_PHONE = /^\+[1-9]\d{6,14}$/;

/** One quoted cell; a boolean is worded "Ha" / "Yo‘q" in `locale` (the API's yes/no words). */
export function csvCell(value: CsvCell, locale: Locale = "uz"): string {
  if (value === null || value === undefined) return '""';
  if (typeof value === "number") return `"${String(value)}"`;
  if (typeof value === "boolean") return `"${value ? dataCopy[locale].yes : dataCopy[locale].no}"`;
  const safe = FORMULA_START.test(value) && !E164_PHONE.test(value) ? `'${value}` : value;
  return `"${safe.replace(/"/g, '""')}"`;
}

export function csvDocument(
  header: ReadonlyArray<string>,
  rows: ReadonlyArray<CsvCell[]>,
  locale: Locale = "uz",
): string {
  return (
    "﻿" +
    [header, ...rows]
      .map((row) => row.map((cell) => csvCell(cell, locale)).join(";"))
      .join("\r\n") +
    "\r\n"
  );
}

/** A CSV download response named `<name>.csv`. */
export function csvResponse(
  name: string,
  header: ReadonlyArray<string>,
  rows: ReadonlyArray<CsvCell[]>,
  locale: Locale = "uz",
): Response {
  return new Response(csvDocument(header, rows, locale), {
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
