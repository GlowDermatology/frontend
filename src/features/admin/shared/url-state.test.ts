import { describe, expect, it } from "vitest";

import { parseAuditFilters } from "../audit-log/query";
import { parseOrderQuery } from "../orders/query";
import { parsePaymentQuery } from "../payments/query";
import { parseProductQuery } from "../products/query";
import { isoDateParam, parseSearchParam } from "./url-state";

describe("isoDateParam", () => {
  it("keeps a real calendar day in 2000–2099", () => {
    expect(isoDateParam("2026-10-20")).toBe("2026-10-20");
    expect(isoDateParam("2028-02-29")).toBe("2028-02-29");
    expect(isoDateParam("2000-01-01")).toBe("2000-01-01");
    expect(isoDateParam("2099-12-31")).toBe("2099-12-31");
  });

  it("drops malformed, impossible and half-typed days", () => {
    for (const value of [
      undefined,
      "",
      "2026-1-20",
      "20261020",
      "2026-10-20T00:00",
      "2026-02-30",
      "2026-13-01",
      "2027-02-29",
      // A date input mid-year: Chrome reports each typed digit as a full value.
      "0002-10-20",
      "0020-10-20",
      "0202-10-20",
      "1999-12-31",
      "2100-01-01",
    ]) {
      expect(isoDateParam(value)).toBeUndefined();
    }
  });
});

describe("parseSearchParam", () => {
  it("drops control characters (a NUL is a Django 400), trims and caps the length", () => {
    expect(parseSearchParam("\u0000")).toBeUndefined();
    expect(parseSearchParam(" Mali\u0000ka\t ")).toBe("Malika");
    expect(parseSearchParam("a".repeat(80))).toBe("a".repeat(64));
    expect(parseSearchParam("   ")).toBeUndefined();
    expect(parseSearchParam(undefined)).toBeUndefined();
  });

  it("is applied by every board that sends free text to the API", () => {
    expect(parseOrderQuery({ q: "\u0000" }).q).toBeUndefined();
    expect(parseProductQuery({ q: "\u0000serum" }).q).toBe("serum");
    expect(parsePaymentQuery({ q: "\u0000" }).q).toBeUndefined();
    expect(parseAuditFilters({ object_id: "12\u0000" }).objectId).toBe("12");
  });
});
