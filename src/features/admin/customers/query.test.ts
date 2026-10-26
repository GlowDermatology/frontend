import { describe, expect, it } from "vitest";

import { customerListHref, hasActiveCustomerFilters, parseCustomerQuery } from "./query";

describe("customers list URL state", () => {
  it("parses the board's own names with defaults and drops values the API would refuse", () => {
    expect(parseCustomerQuery({})).toEqual({
      q: undefined,
      status: undefined,
      group: undefined,
      sort: "registered_desc",
      page: 1,
      pageSize: 20,
    });
    expect(
      parseCustomerQuery({
        q: "  Malika ",
        status: "deleted",
        group: "2",
        sort: "balance_asc",
        page: "3",
        size: "50",
      }),
    ).toEqual({
      q: "Malika",
      status: "deleted",
      group: "2",
      sort: "balance_asc",
      page: 3,
      pageSize: 50,
    });
    // Unknown values fall back instead of becoming a 400 (`segment` `invalid`, `page_size` `invalid_choice`).
    expect(
      parseCustomerQuery({ status: "gone", group: "abc", sort: "-x", size: "25", page: "-1" }),
    ).toMatchObject({
      status: undefined,
      group: undefined,
      sort: "registered_desc",
      pageSize: 20,
      page: 1,
    });
    expect(parseCustomerQuery({ q: "x".repeat(80) }).q).toHaveLength(64);
  });

  it("removes control characters from the search so Django never sees a NUL (400)", () => {
    expect(parseCustomerQuery({ q: "\u0000abc" }).q).toBe("abc");
    expect(parseCustomerQuery({ q: "\u0000" }).q).toBeUndefined();
    expect(parseCustomerQuery({ q: "\u0000\u0001 \u007f" }).q).toBeUndefined();
    expect(parseCustomerQuery({ q: " Ma\u0000lika\t\n" }).q).toBe("Malika");
    expect(parseCustomerQuery({ q: "90 123\u009f" }).q).toBe("90 123");
    // The cut to 64 characters applies after the removal.
    expect(parseCustomerQuery({ q: "\u0000".repeat(10) + "y".repeat(70) }).q).toBe("y".repeat(64));
  });

  it("writes short links and keeps the filters in the export link", () => {
    expect(customerListHref({ sort: "registered_desc", pageSize: 20, page: 1 })).toBe(
      "/admin/customers",
    );
    expect(
      customerListHref({
        q: "90 123",
        status: "active",
        group: "1",
        sort: "name_asc",
        pageSize: 50,
        page: 2,
      }),
    ).toBe("/admin/customers?q=90+123&status=active&group=1&sort=name_asc&size=50&page=2");
    expect(customerListHref({ group: "1", sort: "total_desc" }, "/admin/customers/export")).toBe(
      "/admin/customers/export?group=1&sort=total_desc",
    );
    expect(hasActiveCustomerFilters(parseCustomerQuery({ sort: "name_asc" }))).toBe(false);
    expect(hasActiveCustomerFilters(parseCustomerQuery({ group: "1" }))).toBe(true);
  });
});
