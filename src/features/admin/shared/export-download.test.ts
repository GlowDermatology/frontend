import { describe, expect, it, vi } from "vitest";

import { NETWORK_ERROR_MESSAGE } from "./action-client";
import {
  downloadFilename,
  EXPORT_FAILED_MESSAGE,
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
