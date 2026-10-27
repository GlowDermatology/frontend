import { describe, expect, it } from "vitest";

import { hasActiveFilters, orderListHref, parseOrderQuery } from "./query";

const params = (href: string) => Object.fromEntries(new URL(href, "http://x").searchParams);

describe("parseOrderQuery / orderListHref", () => {
  it("defaults to this month, newest first, 10 rows", () => {
    const query = parseOrderQuery({});
    expect(query).toEqual({
      dateFrom: undefined,
      dateTo: undefined,
      customer: undefined,
      status: undefined,
      q: undefined,
      period: "month",
      fulfilment: undefined,
      payment: undefined,
      sort: "date_desc",
      page: 1,
      pageSize: 10,
    });
    expect(orderListHref(query)).toBe("/admin/orders");
    expect(hasActiveFilters(query)).toBe(false);
  });

  it("round-trips every filter through the URL", () => {
    const href =
      "/admin/orders?status=processing&q=10248&period=all&fulfilment=delivery&payment=paid" +
      "&date_from=2026-10-01&date_to=2026-10-24&customer=7&sort=date_asc&page=3&size=25";
    const query = parseOrderQuery(params(href));
    expect(query).toMatchObject({
      status: "processing",
      q: "10248",
      period: "all",
      fulfilment: "delivery",
      payment: "paid",
      dateFrom: "2026-10-01",
      dateTo: "2026-10-24",
      customer: "7",
      sort: "date_asc",
      page: 3,
      pageSize: 25,
    });
    expect(parseOrderQuery(params(orderListHref(query)))).toEqual(query);
    expect(hasActiveFilters(query)).toBe(true);
  });

  it("drops malformed values and swaps an inverted range", () => {
    const query = parseOrderQuery({
      status: "lost",
      period: "year",
      fulfilment: "drone",
      payment: "maybe",
      sort: "name",
      page: "-2",
      size: "7",
      customer: "abc",
      date_from: "2026-02-30",
      date_to: "0002-10-20",
    });
    expect(query).toMatchObject({
      status: undefined,
      period: "month",
      fulfilment: undefined,
      payment: undefined,
      sort: "date_desc",
      page: 1,
      pageSize: 10,
      customer: undefined,
      dateFrom: undefined,
      dateTo: undefined,
    });
    expect(parseOrderQuery({ customer: "0" }).customer).toBeUndefined();
    expect(parseOrderQuery({ customer: "1234567890123" }).customer).toBeUndefined();
    const inverted = parseOrderQuery({ date_from: "2026-10-24", date_to: "2026-10-01" });
    expect([inverted.dateFrom, inverted.dateTo]).toEqual(["2026-10-01", "2026-10-24"]);
    expect(parseOrderQuery({ q: "x".repeat(80) }).q).toHaveLength(64);
    expect(parseOrderQuery({ q: ["a", "b"] }).q).toBe("a");
  });

  it("accepts only the page sizes of the design", () => {
    for (const size of [6, 10, 25, 50]) {
      expect(parseOrderQuery({ size: String(size) }).pageSize).toBe(size);
    }
    for (const size of ["7", "20", "100", "0", "x"]) {
      expect(parseOrderQuery({ size }).pageSize).toBe(10);
    }
  });

  it("builds the export link with the filters, without page or size", () => {
    const query = parseOrderQuery(
      params("/admin/orders?status=delivered&page=4&size=50&period=week"),
    );
    expect(
      orderListHref({ ...query, page: undefined, pageSize: undefined }, "/admin/orders/export"),
    ).toBe("/admin/orders/export?status=delivered&period=week");
  });
});
