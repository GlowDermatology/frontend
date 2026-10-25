import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { StaffSession } from "./auth";

/**
 * The shared export route body (`exportRoute`): the staff session gate, the
 * api-mode stream-through with a sanitised `Content-Disposition`, the error
 * pass-through (the client turns it into a toast), and the mock CSV.
 */

const verifyStaff = vi.fn<() => Promise<StaffSession>>();
const apiFetchRaw = vi.fn();

vi.mock("next/server", () => ({ connection: vi.fn(async () => undefined) }));
vi.mock("./auth", () => ({ verifyStaff: () => verifyStaff() }));
vi.mock("./api/client", () => ({
  apiFetchRaw: (...args: unknown[]) => apiFetchRaw(...args),
  apiFetch: vi.fn(),
  cachedGet: vi.fn(),
  buildQuery: () => "",
}));

import { ApiError } from "./api/errors";
import { exportRoute, type ExportRouteOptions } from "./export";

const originalSource = process.env.GLOWDERMA_DATA_SOURCE;

function options(overrides: Partial<ExportRouteOptions> = {}): ExportRouteOptions {
  return {
    resource: "products",
    name: "mahsulotlar",
    format: "csv",
    apiParams: { category: "serums" },
    mock: async () => ({ header: ["ID", "Nomi"], rows: [[1, "=Serum"]] }),
    ...overrides,
  };
}

beforeEach(() => {
  process.env.GLOWDERMA_DATA_SOURCE = "api";
  verifyStaff.mockReset();
  apiFetchRaw.mockReset();
  verifyStaff.mockResolvedValue({ ok: true, mode: "api", token: "staff-token", sid: null });
});

afterEach(() => {
  if (originalSource === undefined) delete process.env.GLOWDERMA_DATA_SOURCE;
  else process.env.GLOWDERMA_DATA_SOURCE = originalSource;
});

describe("exportRoute", () => {
  it("answers 401 JSON without a session and never calls the API or the params", async () => {
    verifyStaff.mockResolvedValue({ ok: false, reason: "no_session" });
    const apiParams = vi.fn(async () => ({}));
    const response = await exportRoute(options({ apiParams }));
    expect(response.status).toBe(401);
    expect(await response.json()).toMatchObject({ code: "not_authenticated" });
    expect(apiFetchRaw).not.toHaveBeenCalled();
    expect(apiParams).not.toHaveBeenCalled();
  });

  it("streams the upstream body with its type and a sanitised filename", async () => {
    apiFetchRaw.mockResolvedValue(
      new Response('﻿"ID";"Nomi"\r\n', {
        status: 200,
        headers: {
          "content-type": "text/csv; charset=utf-8",
          "content-disposition": 'attachment; filename="mahsulotlar-20261026-0025.csv"',
        },
      }),
    );
    const controller = new AbortController();
    const response = await exportRoute(
      options({ apiParams: async () => ({ category: "serums" }), signal: controller.signal }),
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("text/csv; charset=utf-8");
    expect(response.headers.get("content-disposition")).toBe(
      'attachment; filename="mahsulotlar-20261026-0025.csv"',
    );
    expect(await response.text()).toContain('"Nomi"');
    const [path, request] = apiFetchRaw.mock.calls[0]!;
    expect(path).toBe("/api/v1/admin/products/");
    expect(request).toMatchObject({
      token: "staff-token",
      query: { category: "serums", export: "csv" },
      streamBody: true,
      signal: controller.signal,
    });
  });

  it("refuses a hostile upstream filename", async () => {
    apiFetchRaw.mockResolvedValue(
      // A binary body sets no content type: the route falls back to the format's.
      new Response(new Uint8Array([80, 75]), {
        headers: { "content-disposition": 'attachment; filename="../../etc/passwd;x=\"y.xlsx"' },
      }),
    );
    const response = await exportRoute(options({ format: "xlsx" }));
    expect(response.headers.get("content-disposition")).toBe(
      'attachment; filename="mahsulotlar.xlsx"',
    );
    expect(response.headers.get("content-type")).toBe(
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
  });

  it("passes a refusal on as the JSON envelope with Retry-After (429), and 502 for transport", async () => {
    apiFetchRaw.mockRejectedValueOnce(
      new ApiError(
        429,
        {
          code: "throttled",
          message: "Juda ko‘p urinish. 40 soniyadan so‘ng qayta urinib ko‘ring.",
          errors: [],
          request_id: "r",
        },
        { retryAfter: 40 },
      ),
    );
    const throttled = await exportRoute(options());
    expect(throttled.status).toBe(429);
    expect(throttled.headers.get("retry-after")).toBe("40");
    expect(await throttled.json()).toMatchObject({ code: "throttled" });

    apiFetchRaw.mockRejectedValueOnce(
      new ApiError(0, {
        code: "timeout",
        message: "API bilan bog‘lanib bo‘lmadi.",
        errors: [],
        request_id: "",
      }),
    );
    expect((await exportRoute(options())).status).toBe(502);
  });

  it("builds the local CSV in mock mode", async () => {
    delete process.env.GLOWDERMA_DATA_SOURCE;
    verifyStaff.mockResolvedValue({ ok: true, mode: "mock" });
    const response = await exportRoute(options());
    expect(apiFetchRaw).not.toHaveBeenCalled();
    expect(response.headers.get("content-disposition")).toBe(
      'attachment; filename="mahsulotlar.csv"',
    );
    expect(await response.text()).toContain('"\'=Serum"');
  });
});
