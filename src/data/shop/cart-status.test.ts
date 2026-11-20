import { beforeEach, describe, expect, it, vi } from "vitest";
import { cartStatus } from "./commerce.actions";
import { apiCart } from "@/data/api/customer/commerce";
import { guardCustomerAction } from "@/data/customer-auth/session";

vi.mock("@/data/api/customer/commerce", () => ({ apiCart: vi.fn() }));
vi.mock("@/data/customer-auth/session", () => ({ guardCustomerAction: vi.fn() }));
vi.mock("@/lib/env.server", () => ({ serverEnv: { mediaHosts: () => [] } }));

beforeEach(() => vi.clearAllMocks());

describe("background cart status", () => {
  it("refuses an invalid session before reading private cart data", async () => {
    const failure = { ok: false as const, error: "Expired", code: "session_expired" };
    vi.mocked(guardCustomerAction).mockResolvedValueOnce(failure);
    expect(await cartStatus({ locale: "uz", csrf: "bad" })).toEqual(failure);
    expect(apiCart).not.toHaveBeenCalled();
  });

  it("returns mapped cart data without route navigation", async () => {
    vi.mocked(guardCustomerAction).mockResolvedValueOnce({ ok: true } as Awaited<
      ReturnType<typeof guardCustomerAction>
    >);
    vi.mocked(apiCart).mockResolvedValueOnce({
      status: 200,
      headers: new Headers(),
      data: {
        items: [],
        item_count: 0,
        quantity_total: 0,
        items_subtotal: 0,
        promo_subtotal: 0,
        has_problems: false,
        cashback: { available: 0, max_usable_pickup: 0 },
        updated_at: null,
        last_change: null,
        checkout_order: null,
      },
    } as Awaited<ReturnType<typeof apiCart>>);
    expect(await cartStatus({ locale: "en", csrf: "valid" })).toMatchObject({
      ok: true,
      data: { lines: [], checkoutOrder: null },
    });
    expect(apiCart).toHaveBeenCalledWith("en");
  });
});
