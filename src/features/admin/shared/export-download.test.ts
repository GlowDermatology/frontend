import { describe, expect, it, vi } from "vitest";

import { NETWORK_ERROR_MESSAGE } from "./action-client";
import {
  downloadFilename,
  EXPORT_FAILED_MESSAGE,
  EXPORT_SESSION_MESSAGE,
  fallbackFilename,
  fetchExport,
} from "./export-download";

/** The export menu's fetch: a file on 2xx, the envelope's message otherwise (never a JSON page). */

describe("fetchExport", () => {
  it("returns the blob and the route's filename on 200", async () => {
    const fetchImpl = vi.fn<typeof fetch>(
      async () =>
        new Response("﻿ID;Nomi", {
          headers: {
            "content-disposition": 'attachment; filename="kategoriyalar-20261026-0025.csv"',
          },
        }),
    );
    const result = await fetchExport("/admin/categories/export?format=csv", fetchImpl);
    expect(result).toMatchObject({ ok: true, filename: "kategoriyalar-20261026-0025.csv" });
    if (result.ok) expect(await result.blob.text()).toContain("Nomi");
    expect(fetchImpl).toHaveBeenCalledWith(
      "/admin/categories/export?format=csv",
      expect.objectContaining({ credentials: "same-origin", cache: "no-store" }),
    );
  });

  it("treats the login page a redirect chain ends on as a 401, never as the file", async () => {
    // Expired session: proxy 307 → /admin/auth/refresh → 303 /admin/login → 200 HTML.
    const login = new Response("<!doctype html><title>Kirish</title>", {
      headers: { "content-type": "text/html; charset=utf-8" },
    });
    Object.defineProperty(login, "redirected", { value: true });
    Object.defineProperty(login, "url", {
      value: "http://localhost:3105/admin/login?next=%2Fadmin%2Faudit-log",
    });
    expect(
      await fetchExport(
        "/admin/audit-log/export?format=csv",
        vi.fn<typeof fetch>(async () => login),
      ),
    ).toEqual({ ok: false, status: 401, message: EXPORT_SESSION_MESSAGE });

    // A redirect to the login page without an HTML content type is caught by its URL.
    const bare = new Response("", { headers: { "content-type": "application/octet-stream" } });
    Object.defineProperty(bare, "redirected", { value: true });
    Object.defineProperty(bare, "url", { value: "http://localhost:3105/admin/login" });
    expect(
      await fetchExport(
        "/admin/customers/groups/export",
        vi.fn<typeof fetch>(async () => bare),
      ),
    ).toMatchObject({ ok: false, status: 401 });
  });

  it("keeps a file that arrives after an in-chain refresh redirect", async () => {
    const file = new Response("\uFEFFSana;Amal", {
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": 'attachment; filename="harakatlar-jurnali.csv"',
      },
    });
    Object.defineProperty(file, "redirected", { value: true });
    Object.defineProperty(file, "url", { value: "http://localhost:3105/admin/audit-log/export" });
    expect(
      await fetchExport(
        "/admin/audit-log/export",
        vi.fn<typeof fetch>(async () => file),
      ),
    ).toMatchObject({ ok: true, filename: "harakatlar-jurnali.csv" });
  });

  it("turns a 429 envelope into its Uzbek message", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () =>
      Response.json(
        {
          code: "throttled",
          message: "Juda ko‘p urinish. 57 soniyadan so‘ng qayta urinib ko‘ring.",
          errors: [],
        },
        { status: 429, headers: { "retry-after": "57" } },
      ),
    );
    expect(await fetchExport("/admin/products/export?format=csv", fetchImpl)).toEqual({
      ok: false,
      status: 429,
      message: "Juda ko‘p urinish. 57 soniyadan so‘ng qayta urinib ko‘ring.",
    });
  });

  it("falls back to a generic message for a non-JSON error and to the network message", async () => {
    const html = vi.fn<typeof fetch>(async () => new Response("<html>502</html>", { status: 502 }));
    expect(await fetchExport("/admin/banners/export?format=xlsx", html)).toEqual({
      ok: false,
      status: 502,
      message: EXPORT_FAILED_MESSAGE,
    });
    const offline = vi.fn<typeof fetch>(async () => {
      throw new TypeError("Failed to fetch");
    });
    expect(await fetchExport("/admin/banners/export", offline)).toEqual({
      ok: false,
      status: 0,
      message: NETWORK_ERROR_MESSAGE,
    });
  });
});

describe("download filenames", () => {
  it("keeps only a safe name", () => {
    expect(downloadFilename('attachment; filename="mahsulotlar.csv"', "x.csv")).toBe(
      "mahsulotlar.csv",
    );
    expect(downloadFilename('attachment; filename="../a.csv"', "x.csv")).toBe("x.csv");
    expect(downloadFilename(null, "x.csv")).toBe("x.csv");
    expect(fallbackFilename("/admin/products/export?q=a&format=xlsx")).toBe("eksport.xlsx");
    expect(fallbackFilename("/admin/products/export?format=csv")).toBe("eksport.csv");
  });
});
