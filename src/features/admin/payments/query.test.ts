import { describe, expect, it } from "vitest";

import {
  hasActivePaymentFilters,
  paymentListHref,
  paymentQueryString,
  parsePaymentQuery,
} from "./query";

const params = (href: string) => Object.fromEntries(new URL(href, "http://x").searchParams);

describe("parsePaymentQuery / paymentListHref", () => {
  it("defaults to every date (an old refund may need action), newest first, 20 rows", () => {
    const query = parsePaymentQuery({});
    expect(query).toMatchObject({ period: "all", sort: "date_desc", page: 1, pageSize: 20 });
    expect(paymentListHref(query)).toBe("/admin/payments");
    expect(hasActivePaymentFilters(query)).toBe(false);
  });

  it("round-trips every filter, needs_action included", () => {
    const href =
      "/admin/payments?q=10230&status=paid&provider=payme&refund=needs_action&period=month" +
      "&date_from=2026-10-01&date_to=2026-10-24&sort=date_asc&page=2&size=50";
    const query = parsePaymentQuery(params(href));
    expect(query).toEqual({
      q: "10230",
      status: "paid",
      provider: "payme",
      refund: "needs_action",
      period: "month",
      dateFrom: "2026-10-01",
      dateTo: "2026-10-24",
      sort: "date_asc",
      page: 2,
      pageSize: 50,
    });
    expect(parsePaymentQuery(params(paymentListHref(query)))).toEqual(query);
    expect(hasActivePaymentFilters(query)).toBe(true);
    expect(parsePaymentQuery({ refund: "manual_required" }).refund).toBe("manual_required");
  });

  it("drops malformed values and swaps an inverted range", () => {
    const query = parsePaymentQuery({
      status: "stolen",
      provider: "cash",
      refund: "lost",
      period: "year",
      sort: "amount",
      size: "7",
      page: "abc",
      date_from: "0006-10-20",
      date_to: "2026-02-30",
    });
    expect(query).toMatchObject({
      status: undefined,
      provider: undefined,
      refund: undefined,
      period: "all",
      sort: "date_desc",
      pageSize: 20,
      page: 1,
      dateFrom: undefined,
      dateTo: undefined,
    });
    const inverted = parsePaymentQuery({ date_from: "2026-10-24", date_to: "2026-10-01" });
    expect([inverted.dateFrom, inverted.dateTo]).toEqual(["2026-10-01", "2026-10-24"]);
    expect(parsePaymentQuery({ q: `  ${"7".repeat(80)}  ` }).q).toHaveLength(64);
    expect(parsePaymentQuery({ q: "   " }).q).toBeUndefined();
    expect(parsePaymentQuery({ size: "50" }).pageSize).toBe(50);
    expect(parsePaymentQuery({ size: "25" }).pageSize).toBe(20);
  });

  it("omits defaults from the query string used by the export link", () => {
    expect(paymentQueryString({ period: "all", sort: "date_desc", page: 1, pageSize: 20 })).toBe(
      "",
    );
    const query = parsePaymentQuery(params("/admin/payments?status=failed&page=3&size=50"));
    expect(
      `/admin/payments/export${paymentQueryString({ ...query, page: undefined, pageSize: undefined })}`,
    ).toBe("/admin/payments/export?status=failed");
  });
});
