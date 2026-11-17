import { afterEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/data/api/errors";

/**
 * The sidebar Billz block sits on every admin page: an API failure must
 * degrade to the neutral line, never escape into the segment error boundary.
 */

const verifyStaff = vi.fn();
const getCatalogStats = vi.fn();
vi.mock("@/data/auth", () => ({ verifyStaff: () => verifyStaff() }));
vi.mock("@/data/products", () => ({ getCatalogStats: () => getCatalogStats() }));
vi.mock("@/data/now", () => ({ requestNow: async () => new Date("2026-10-24T12:00:00+05:00") }));
const locale = vi.hoisted(() => ({ current: "uz" as "uz" | "ru" | "en" }));
vi.mock("@/lib/i18n/admin-locale", async () => {
  const { createFormatter } = await import("@/lib/format");
  return {
    copyFor: async (copy: Record<string, unknown>) => copy[locale.current],
    getFormat: async () => createFormatter(locale.current),
  };
});

const UNKNOWN = "Billz holati noma’lum";

const STATS = {
  total: 248,
  active: 200,
  hidden: 48,
  outOfStock: 3,
  newFromBillz: 4,
  billzConnected: true,
  lastSyncAt: "2026-10-24T11:50:00+05:00",
  lastSyncLabel: "10 daqiqa oldin",
};

const apiError = (status: number, code: string) =>
  new ApiError(status, { code, message: "Kutilmagan xato.", errors: [], request_id: "" });

async function render() {
  const mod = await import("./billz-status");
  const element = (await mod.BillzStatus()) as { type: unknown; props: Record<string, unknown> };
  return { ...mod, element };
}

afterEach(() => {
  locale.current = "uz";
  verifyStaff.mockReset();
  getCatalogStats.mockReset();
});

describe("BillzStatus", () => {
  it("renders the connection line from the stats", async () => {
    verifyStaff.mockResolvedValue({ ok: true });
    getCatalogStats.mockResolvedValue(STATS);
    const { element, BillzStatusFallback } = await render();
    expect(element.type).not.toBe(BillzStatusFallback);
    expect(JSON.stringify(element.props)).toContain("Billz ulangan");
    expect(JSON.stringify(element.props)).toContain("10 daqiqa oldin");
  });

  it("speaks the admin language", async () => {
    locale.current = "ru";
    verifyStaff.mockResolvedValue({ ok: true });
    getCatalogStats.mockResolvedValue({ ...STATS, billzConnected: false });
    const { element } = await render();
    const text = JSON.stringify(element.props);
    expect(text).toContain("Billz не подключён");
    expect(text).toContain("Синхронизация: 10 минут назад");

    locale.current = "en";
    getCatalogStats.mockResolvedValue({ ...STATS, lastSyncAt: null });
    const english = JSON.stringify((await render()).element.props);
    expect(english).toContain("Billz connected");
    expect(english).toContain("Synced: not synced yet");
  });

  it("shows the neutral line without a session", async () => {
    verifyStaff.mockResolvedValue({ ok: false });
    const { element, BillzStatusFallback } = await render();
    expect(element.type).toBe(BillzStatusFallback);
    expect(element.props.label).toBe(UNKNOWN);
    expect(getCatalogStats).not.toHaveBeenCalled();
  });

  it("degrades to the neutral line when products/stats/ fails or does not answer", async () => {
    for (const failure of [
      apiError(0, "network_error"),
      apiError(0, "timeout"),
      apiError(500, "server_error"),
      apiError(429, "throttled"),
      apiError(503, "service_unavailable"),
    ]) {
      verifyStaff.mockResolvedValue({ ok: true });
      getCatalogStats.mockRejectedValue(failure);
      const { element, BillzStatusFallback } = await render();
      expect(element.type).toBe(BillzStatusFallback);
      expect(element.props.label).toBe(UNKNOWN);
    }
  });

  it("still surfaces a programming error (not an ApiError)", async () => {
    verifyStaff.mockResolvedValue({ ok: true });
    getCatalogStats.mockRejectedValue(new TypeError("mapper bug"));
    const mod = await import("./billz-status");
    await expect(mod.BillzStatus()).rejects.toThrow(TypeError);
  });
});
